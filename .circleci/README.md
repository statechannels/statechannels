# Docker image for CircleCI

In order to update this image in Docker, run the following:

```sh
docker build .
docker tag [tagnumber] counterfactual/statechannels:latest
docker push counterfactual/statechannels:latest
```
