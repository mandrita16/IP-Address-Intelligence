
from flask import Flask, render_template, request, jsonify
import requests
import ipaddress

app = Flask(__name__)

API_URL = "https://ipwho.is/"


def get_ip_data(ip=None):
    """Fetch and normalize IP geolocation information."""

    url = API_URL + ip if ip else API_URL

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        raw = response.json()

        if not raw.get("success", False):
            raise ValueError(
                raw.get("message", "IP lookup service rejected the request.")
            )

        connection = raw.get("connection") or {}
        timezone = raw.get("timezone") or {}

        offset_seconds = timezone.get("offset")
        utc_offset = None

        if isinstance(offset_seconds, (int, float)):
            sign = "+" if offset_seconds >= 0 else "-"
            offset_seconds = abs(int(offset_seconds))
            hours, remainder = divmod(offset_seconds, 3600)
            minutes = remainder // 60
            utc_offset = f"UTC{sign}{hours:02d}:{minutes:02d}"

        return {
            "ip": raw.get("ip"),
            "version": raw.get("type", "").upper(),
            "city": raw.get("city"),
            "region": raw.get("region"),
            "country_name": raw.get("country"),
            "continent_code": raw.get("continent_code"),
            "postal": raw.get("postal"),
            "org": connection.get("isp") or connection.get("org"),
            "asn": (
                f"AS{connection['asn']}"
                if connection.get("asn") is not None
                else None
            ),
            "timezone": timezone.get("id"),
            "utc_offset": utc_offset,
            "latitude": raw.get("latitude"),
            "longitude": raw.get("longitude")
        }

    except requests.RequestException as error:
        raise RuntimeError("Unable to reach the IP lookup service.") from error


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/my-ip")
def my_ip():
    try:
        return jsonify(get_ip_data())
    except (ValueError, RuntimeError) as error:
        return jsonify({"error": str(error)}), 502


@app.route("/api/lookup")
def lookup():
    ip = request.args.get("ip", "").strip()

    if not ip:
        return jsonify({"error": "Please enter an IP address."}), 400

    try:
        parsed_ip = ipaddress.ip_address(ip)

        if not parsed_ip.is_global:
            return jsonify({
                "error": "Please enter a valid public IP address."
            }), 400

        return jsonify(get_ip_data(str(parsed_ip)))

    except ValueError:
        return jsonify({"error": "Invalid IP address format."}), 400

    except RuntimeError as error:
        return jsonify({"error": str(error)}), 502


if __name__ == "__main__":
    app.run(debug=True)
