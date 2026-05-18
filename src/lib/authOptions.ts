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

// Custom Instagram Graph API provider (auth goes through Facebook OAuth)
const InstagramProvider: OAuthConfig<any> = {
  id: "instagram",
  name: "Instagram",
  type: "oauth",
  authorization: {
    url: "https://www.facebook.com/dialog/oauth",
    params: {
      scope: [
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_insights",
        "pages_show_list",
        "pages_read_engagement",
        "threads_basic",
        "threads_content_publish",
      ].join(","),
      response_type: "code",
    },
  },
  token: "https://graph.facebook.com/oauth/access_token",
  userinfo: {
    url: "https://graph.facebook.com/me",
    params: { fields: "id,name,email,picture" },
  },
  profile(profile) {
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email ?? null,
      image: profile.picture?.data?.url ?? null,
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
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
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
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
