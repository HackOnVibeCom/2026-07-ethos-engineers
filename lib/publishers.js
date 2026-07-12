// ============================================================================
// THE PUBLISHER ENGINE — LaunchCopilot doesn't just write your launch, it
// SHIPS it. Each publisher takes generated copy and creates a real, live post
// via that platform's API, returning the public URL.
//
// Configured entirely by env vars; configuredChannels() reports what's live.
// ============================================================================

import crypto from "node:crypto";

const UA = "LaunchCopilot/1.0 (indie app launch autopilot)";

function link(app) {
  return app.store_link || "";
}

function fillLink(text, app) {
  return (text || "").replaceAll("[STORE_LINK]", link(app)).trim();
}

// ---------------------------------------------------------------------------
// Reddit — script-app password grant (reddit.com/prefs/apps → "script")
// ---------------------------------------------------------------------------
async function redditToken() {
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization:
        "Basic " +
        Buffer.from(
          `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
        ).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": UA,
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Reddit auth failed: " + JSON.stringify(data).slice(0, 200));
  }
  return data.access_token;
}

async function publishReddit(app, assets) {
  const content = assets.reddit;
  if (!content) throw new Error("Generate the Reddit copy first.");
  // Safety: post to YOUR configured subreddit (e.g. a test sub or your app's
  // own community) — never spam the AI-suggested sub without reading its rules.
  const sr = (process.env.REDDIT_SUBREDDIT || "").replace(/^r\//, "");
  if (!sr) throw new Error("Set REDDIT_SUBREDDIT in .env.local (e.g. your test subreddit).");

  const token = await redditToken();
  const res = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": UA,
    },
    body: new URLSearchParams({
      sr,
      kind: "self",
      title: content.title,
      text: fillLink(content.body, app),
      api_type: "json",
    }),
  });
  const data = await res.json();
  const errors = data?.json?.errors;
  if (errors?.length) throw new Error("Reddit rejected the post: " + JSON.stringify(errors));
  const url = data?.json?.data?.url;
  if (!url) throw new Error("Reddit did not return a post URL: " + JSON.stringify(data).slice(0, 200));
  return { url };
}

// ---------------------------------------------------------------------------
// Telegram — bot posts the launch announcement to your channel
// ---------------------------------------------------------------------------
async function publishTelegram(app, assets) {
  const tagline = assets.product_hunt?.tagline;
  const hook = assets.twitter?.tweets?.[0];
  const text = [
    `🚀 ${app.name} just launched!`,
    tagline ? `\n${tagline}` : `\n${app.pitch}`,
    hook ? `\n${fillLink(hook, app)}` : "",
    link(app) ? `\n${link(app)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not set in .env.local");

  let chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    try {
      const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
      const updatesData = await updatesRes.json();
      if (updatesData?.ok && updatesData?.result?.length) {
        for (let i = updatesData.result.length - 1; i >= 0; i--) {
          const u = updatesData.result[i];
          const cid =
            u.channel_post?.chat?.id ||
            u.message?.chat?.id ||
            u.my_chat_member?.chat?.id ||
            u.callback_query?.message?.chat?.id;
          if (cid) {
            chatId = cid;
            break;
          }
        }
      }
    } catch (err) {
      // Fall through to error check below
    }
  }

  if (!chatId) {
    throw new Error(
      "Telegram chat ID not set. Either add TELEGRAM_CHAT_ID=@yourchannel (or numeric ID) to .env.local, or send a message / add @launch2bot as admin to your Telegram channel first so it can auto-detect the chat."
    );
  }

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
  const data = await res.json();
  if (!data.ok) throw new Error("Telegram error: " + (data.description || res.status));
  const chat = data.result?.chat;
  const url = chat?.username
    ? `https://t.me/${chat.username}/${data.result.message_id}`
    : `https://t.me/c/${String(chat?.id || "").replace(/^-100/, "")}/${data.result.message_id || ""}`;
  return { url };
}

// ---------------------------------------------------------------------------
// X / Twitter — OAuth 1.0a user context, posts the whole thread
// ---------------------------------------------------------------------------
function oauth1Header(method, url, tokens) {
  const oauth = {
    oauth_consumer_key: tokens.appKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: tokens.accessToken,
    oauth_version: "1.0",
  };
  const enc = encodeURIComponent;
  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${enc(k)}=${enc(oauth[k])}`)
    .join("&");
  const base = [method.toUpperCase(), enc(url), enc(paramString)].join("&");
  const signingKey = `${enc(tokens.appSecret)}&${enc(tokens.accessSecret)}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");
  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${enc(k)}="${enc(oauth[k])}"`)
      .join(", ")
  );
}

async function publishTwitter(app, assets) {
  const content = assets.twitter;
  if (!content?.tweets?.length) throw new Error("Generate the X thread first.");
  const tokens = {
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  };
  const url = "https://api.twitter.com/2/tweets";
  let firstId = null;
  let replyTo = null;

  for (const raw of content.tweets) {
    const body = { text: fillLink(raw, app) };
    if (replyTo) body.reply = { in_reply_to_tweet_id: replyTo };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: oauth1Header("POST", url, tokens),
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const id = data?.data?.id;
    if (!id) throw new Error(`X API error ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
    if (!firstId) firstId = id;
    replyTo = id;
  }
  return { url: `https://x.com/i/web/status/${firstId}` };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
const PUBLISHERS = {
  reddit: {
    label: "Reddit",
    isConfigured: () =>
      !!(
        process.env.REDDIT_CLIENT_ID &&
        process.env.REDDIT_CLIENT_SECRET &&
        process.env.REDDIT_USERNAME &&
        process.env.REDDIT_PASSWORD &&
        process.env.REDDIT_SUBREDDIT
      ),
    publish: publishReddit,
  },
  telegram: {
    label: "Telegram",
    isConfigured: () => !!process.env.TELEGRAM_BOT_TOKEN,
    publish: publishTelegram,
  },
  twitter: {
    label: "X / Twitter",
    isConfigured: () =>
      !!(
        process.env.TWITTER_APP_KEY &&
        process.env.TWITTER_APP_SECRET &&
        process.env.TWITTER_ACCESS_TOKEN &&
        process.env.TWITTER_ACCESS_SECRET
      ),
    publish: publishTwitter,
  },
};

export const PUBLISHABLE_CHANNELS = Object.keys(PUBLISHERS);

export function configuredChannels() {
  return PUBLISHABLE_CHANNELS.filter((c) => PUBLISHERS[c].isConfigured());
}

// assets: { channelKey: contentJson } for this app
export async function publish(channel, app, assets) {
  const pub = PUBLISHERS[channel];
  if (!pub) throw new Error(`No publisher for channel: ${channel}`);
  if (!pub.isConfigured()) {
    throw new Error(`${pub.label} is not configured — add its keys to .env.local (see .env.example).`);
  }
  return pub.publish(app, assets);
}
