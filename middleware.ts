import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieItem {
  name: string;
  value: string;
  options?: CookieOptions;
}

// Refresh la session Supabase à chaque requête + applique les headers sécu.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(list: CookieItem[]) {
          list.forEach(({ name, value }: CookieItem) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }: CookieItem) =>
            res.cookies.set({ name, value, ...(options ?? {}) }),
          );
        },
      },
    },
  );

  // Ne rien faire du user ici — on veut juste que le refresh se fasse.
  await supabase.auth.getUser();

  // Headers sécurité
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|banner.png|manifest.webmanifest).*)"],
};
