import os

def get_secret(key):
    file_key = f"{key}_FILE"
    if file_key in os.environ:
        with open(os.environ[file_key]) as f:
            return f.read().strip()
    return os.environ.get(key, '')

with open('/etc/synapse-config/homeserver.yaml.tpl') as f:
    content = f.read()

for key in ['MATRIX_SERVER_NAME', 'MATRIX_DB_USER', 'MATRIX_DB_PASSWORD', 'MATRIX_REGISTRATION_SECRET',
            'MATRIX_MACAROON_SECRET_KEY', 'MATRIX_FORM_SECRET']:
    content = content.replace(f'${{{key}}}', get_secret(key))

with open('/data/homeserver.yaml', 'w') as f:
    f.write(content)

print('[entrypoint] homeserver.yaml generated from template')
