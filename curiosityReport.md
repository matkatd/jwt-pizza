# Open Source/Free Alternatives to AWS for DevOps

https://github.com/guenter/aws-oss-alternatives?tab=readme-ov-file

## S3

- [Minio](https://min.io/docs/minio/kubernetes/upstream/index.html)
  - S3 compatible API
  - host/deploy anywhere using Kubernetes or Docker
- [Garage](https://garagehq.deuxfleurs.fr/documentation/quick-start/)
  - lightweight, simple, internet enabled

## CloudFront

- Cloudflare
  - Not open source, but free
  - Might require your domain hosting to be through them, but also they have good prices on domains

## RDS

- Host your own MySQL or PostgreSQL instance (probably using docker)

## EC2

- Vercel
  - Mostly for web hosting, not sure if they support hosting a server

## ECS

- [Kubernetes](https://kubernetes.io/)
- [Marathon](https://mesosphere.github.io/marathon/)

## ECR

- [Docker Registry](https://github.com/docker/distribution)
- Docker Hub
- [Quay](https://quay.io/)

## Thoughts

- The advantage of each of these services is that they are free (or have more generous free tiers than Amazon) and that you have complete control over all your resources (since most likely you'll have to self host most of these services)
- The disadvantage is that making them work together will be a lot more of a headache than just using AWS. Additionally, AWS probably has better uptime than anything your own small team could attain.
