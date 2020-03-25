FROM counterfactual/statechannels:0.5.13

WORKDIR /statechannels/tracker
COPY ./ /statechannels/tracker/
RUN yarn --production

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["node", "index.js"]
