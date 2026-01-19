import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Login | Recetui",
  description: "Melden Sie sich bei Ihrem Recetui-Konto an.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8">
        <Image
          src="/recetui-logo-frei.png"
          alt="Recetui Logo"
          width={200}
          height={60}
          className="h-16 w-auto object-contain"
          priority
        />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Anmelden</CardTitle>
          <CardDescription>
            Geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" placeholder="name@example.com" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Passwort</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Passwort vergessen?
              </Link>
            </div>
            <Input id="password" type="password" required />
          </div>
          <Button className="w-full" type="submit">
            Anmelden
          </Button>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground text-center w-full">
            Noch kein Konto?{" "}
            <Link href="/register" className="underline underline-offset-4 hover:text-primary">
              Registrieren
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
