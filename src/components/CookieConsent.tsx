import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

const CONSENT_KEY = "iq_cookie_consent";

type ConsentValue = "accepted" | "rejected" | null;

function getConsent(): ConsentValue {
  return localStorage.getItem(CONSENT_KEY) as ConsentValue;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner if no consent recorded
    if (!getConsent()) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-muted-foreground">
          We use essential cookies to keep you signed in and functional cookies to improve your experience.
          See our{" "}
          <a href="/privacy" className="text-primary underline hover:no-underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" className="text-primary underline hover:no-underline">
            Terms of Service
          </a>
          .
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={reject}>
            Reject
          </Button>
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
        <button onClick={reject} className="absolute top-2 right-2 sm:hidden text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
