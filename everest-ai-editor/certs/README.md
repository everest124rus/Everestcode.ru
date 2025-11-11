# NUЦ Минцифры Certificates for GigaChat (macOS)

Place the downloaded certificates from Gosuslugi portal here:

- russian_trusted_root_ca.crt
- russian_trusted_sub_ca.crt

After placing the files, set the following env vars (already added to `.env`):

- RUS_CERTS_DIR=./certs
- RUS_CERT_ROOT=./certs/russian_trusted_root_ca.crt
- RUS_CERT_SUB=./certs/russian_trusted_sub_ca.crt

These are used by `server.js` to configure an HTTPS agent for GigaChat requests.
