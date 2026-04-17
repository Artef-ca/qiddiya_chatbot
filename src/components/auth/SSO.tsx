"use client";

import { Button } from "@/components/ui/button";
// import { useRouter } from "next/navigation";

const SSO = () => {
  // const router = useRouter();
  const handleLogin = () => {
    window.location.href = "/api/auth/saml/login";
    // router.push("/overview");
  };

  return (
    <div className="pt-4">
      <Button
        className="cursor-pointer w-full rounded-lg bg-linear-to-r from-[#7122F4] to-[#9656FF] px-6 py-3 text-white font-medium transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#7122F4] focus:ring-offset-2"
        type="button"
        onClick={handleLogin}
      >
        Login with SSO
      </Button>
    </div>
  );
};

export default SSO;
