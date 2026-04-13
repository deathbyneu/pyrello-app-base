import os

from app import create_app


app = create_app()


if __name__ == "__main__":
    host = os.environ.get("BACKEND_HOST", "127.0.0.1")
    port = int(os.environ.get("BACKEND_PORT", "5000"))
    app.run(debug=True, host=host, port=port)
