import argparse
import secrets
import string

DEFAULT_LENGTH = 32


def generate_key(length: int, prefix: str = "") -> str:
    alphabet = string.ascii_letters + string.digits
    core = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}{core}"


def main():
    parser = argparse.ArgumentParser(description="Generate API keys for FlashRates")
    parser.add_argument("--count", type=int, default=2, help="Number of keys to generate")
    parser.add_argument("--length", type=int, default=DEFAULT_LENGTH, help="Length of key body")
    parser.add_argument("--prefix", type=str, default="fr_", help="Key prefix")
    args = parser.parse_args()

    keys = [generate_key(args.length, args.prefix) for _ in range(args.count)]

    print("Generated API Keys:")
    for key in keys:
        print(key)

    print("\nAdd to .env as:")
    print(f"API_KEYS={','.join(keys)}")


if __name__ == "__main__":
    main()
