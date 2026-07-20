#!/usr/bin/env python3
"""
Run this LOCALLY (on your own machine / home internet) to generate a Garmin session
token for the GitHub Action.

Why: Garmin blocks logins coming from GitHub's datacenter IPs (429 rate-limit +
CAPTCHA). So we log in once here from your residential IP, then hand CI a saved
token that resumes the session without ever logging in again.

Usage:
    pip install garminconnect
    python worker/garmin/get_token.py

Then copy the printed value into a GitHub repo secret named  GARMINTOKENS_BASE64
(Settings -> Secrets and variables -> Actions -> New repository secret).

The token is good for ~1 year; just re-run this if the Action starts failing on auth.
"""
import getpass
from garminconnect import Garmin


def main() -> None:
    email = input("Garmin Connect email: ").strip()
    password = getpass.getpass("Garmin Connect password: ")

    def mfa() -> str:
        return input("MFA code (if your account has 2FA; else press Enter): ").strip()

    client = Garmin(email=email, password=password, prompt_mfa=mfa)
    client.login()

    token = client.garth.dumps()
    print("\n================= GARMINTOKENS_BASE64 =================\n")
    print(token)
    print("\n=======================================================")
    print("Paste the block above as the GitHub secret GARMINTOKENS_BASE64.")


if __name__ == "__main__":
    main()
