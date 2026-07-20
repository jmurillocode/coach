#!/usr/bin/env python3
"""
Run this LOCALLY (on your own machine / home internet) to mint a Garmin session
token for the GitHub Action. Garmin blocks logins from CI datacenter IPs
(429 / CAPTCHA / 403), so we log in once here and hand CI a saved token.

Usage:
    python3 -m venv ~/garmin-venv && source ~/garmin-venv/bin/activate
    pip install garminconnect
    python worker/garmin/get_token.py

Paste the printed value into the GitHub repo secret  GARMINTOKENS_BASE64.
Good for ~1 year; re-run if the Action starts failing on auth.
"""
import os
import io
import base64
import tarfile
import getpass
from garminconnect import Garmin

STORE = os.path.expanduser("~/.garminconnect")


def main() -> None:
    email = input("Garmin Connect email: ").strip()
    password = getpass.getpass("Garmin Connect password: ")

    def mfa() -> str:
        return input("MFA code (if 2FA is on; else press Enter): ").strip()

    os.makedirs(STORE, exist_ok=True)
    client = Garmin(email, password, prompt_mfa=mfa)
    client.login(STORE)  # authenticates and writes token file(s) into STORE

    # Pack the whole token directory (filename-agnostic) into one base64 blob.
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name in os.listdir(STORE):
            tar.add(os.path.join(STORE, name), arcname=name)
    token = base64.b64encode(buf.getvalue()).decode()

    print("\n============== GARMINTOKENS_BASE64 ==============\n")
    print(token)
    print("\n================================================")
    print("Paste the block above as the GitHub secret GARMINTOKENS_BASE64.")


if __name__ == "__main__":
    main()
