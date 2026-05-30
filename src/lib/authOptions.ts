import GoogleProvider from "next-auth/providers/google";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

// Threads OAuth provider
const ThreadsProvider: OAuthConfig<any> = {
  id: "threads",
  name: "Threads",
  type: "oauth",
  authorization: {
    url: "https://threads.net/oauth/authorize",
    params: {
      scope: "threads_basic,threads_content_publish,threads_manage_insights",
      response_type: "code",
    },
  },
  token: "https://graph.threads.net/oauth/access_token",
  userinfo: {
    url: "https://graph.threads.net/me",
    params: { fields: "id,username,name,threads_profile_picture_url" },
  },
  profile(profile) {
    return {
      id: profile.id,
      name: profile.name ?? profile.username,
      email: null,
      image: profile.threads_profile_picture_url ?? null,
    };
  },
  clientId: process.env.THREADS_APP_ID,
  clientSecret: process.env.THREADS_APP_SECRET,
};

// Instagram Business Login (no Facebook account required — works with Professional/Creator accounts)
const InstagramProvider: OAuthConfig<any> = {
  id: "instagram",
  name: "Instagram",
  type: "oauth",
  authorization: {
    url: "https://api.instagram.com/oauth/authorize",
    params: {
      scope: [
        "instagram_business_basic",
        "instagram_business_content_publish",
        "instagram_business_manage_comments",
        "instagram_business_manage_messages",
      ].join(","),
      response_type: "code",
    },
  },
  token: "https://api.instagram.com/oauth/access_token",
  userinfo: {
    url: "https://graph.instagram.com/me",
    params: { fields: "id,name,username,profile_picture_url" },
  },
  profile(profile) {
    return {
      id: profile.id,
      name: profile.name ?? profile.username,
      email: null,
      image: profile.profile_picture_url ?? null,
    };
  },
  clientId: process.env.META_APP_ID,
  clientSecret: process.env.META_APP_SECRET,
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
          ].join(" "),
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    InstagramProvider,
    ThreadsProvider,
  ],
  callbacks: {
    async signIn({ account }) {
      // Exchange Instagram short-lived token for a long-lived one (valid 60 days)
      if (account?.provider === "instagram" && account.access_token) {
        const res = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.META_APP_SECRET}&access_token=${account.access_token}`
        )
        const data = await res.json()
        if (data.access_token) {
          account.access_token = data.access_token
          account.expires_at = Math.floor(Date.now() / 1000) + (data.expires_in ?? 5184000)
        }
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
