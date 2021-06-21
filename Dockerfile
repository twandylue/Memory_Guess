FROM nginx
LABEL maintainer = "Andy Lu <laserlue@gmail.com>"
WORKDIR /home/app
# Remove the default nginx.conf
# RUN rm /etc/nginx/conf.d/default.conf
# # Replace with our own nginx.conf
# COPY nginx.conf /etc/nginx/conf.d/
# COPY ssl.csr /etc/nginx/ssl.csr
# COPY ssl.key /etc/nginx/ssl.key
COPY package*.json ./
RUN apt-get update \
    && apt-get install -y curl \
    && curl -sL https://deb.nodesource.com/setup_14.x | bash - \
    && apt-get install -y nodejs \
    && curl -L https://www.npmjs.com/install.sh | sh \
    && apt-get -y install procps \
    # && npm install \
    # && npm install pm2 -g \
    # && npm install nodemon
COPY . .
# EXPOSE 443
EXPOSE 3000
ADD start.sh /
RUN chmod +x /start.sh
CMD ["bash", "start.sh"]

# Dockerfile
# FROM redis
# WORKDIR /app
# COPY . /app
# RUN apt-get update \
#     && apt-get install -y build-essential \
#     && apt-get install -y python \
#     && apt-get install -y curl \
#     && curl -sL https://deb.nodesource.com/setup_14.x | bash - \
#     && apt-get install -y nodejs \
#     && npm install
# EXPOSE 3000
# CMD node app.js
