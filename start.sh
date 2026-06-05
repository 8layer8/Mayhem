#Create an environment variable with the domain where you want to access your mayhem instance, e.g.:
docker build -t mayhem .

set -a; source .env; set +a

export DOMAIN=mayhem.8layer8.com

#Make sure that your DNS records point that domain (e.g. mayhem.sys.example.com) to one of the IPs of the Docker Swarm mode cluster.
docker stack deploy -c docker-compose.yml mayhem

echo "Access at: https://${DOMAIN}"

sleep 10 
docker stack ps mayhem --no-trunc
sleep 10 
docker stack ps mayhem --no-trunc
docker service logs mayhem_mayhem --no-trunc
