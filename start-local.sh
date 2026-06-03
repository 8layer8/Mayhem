#Create an environment variable with the domain where you want to access your mayhem instance, e.g.:
docker build -t mayhem .

set -a; source .env; set +a

export DOMAIN=mayhem.8layer8.com

#Make sure that your DNS records point that domain (e.g. mayhem.sys.example.com) to one of the IPs of the Docker Swarm mode cluster.
docker compose -f docker-compose-local.yml up -d

echo "Access at: http://localhost:${PORT:-8080}"
