# Memory_Guess

A puzzle online card game helps users improve their mental arithmetic and memory.
* Only available for Chrome  
Website URL: https://andyforfun.site

![Preview](https://memoryguessforreadme.s3.ap-northeast-1.amazonaws.com/preview.png)
---

## Table of Contents
* [Technologies](#Technologies)
* [Structure](#Structure)
* [Database Schema](#Database-Schema)
* [Features](#Features)
* [Demo Accounts](#Demo-Accounts)
* [Contact](#Contact)

## Technologies
### Back-End
* Node.js / Express.js
* Nginx
### Front-End
* HTML
* CSS
* JavaScript
* AJAX
### Database
* MySQL
* Redis
### Framework
* MVC
### Cloud Service (AWS)
* Elastic Compute Cloud (EC2)
* Relational Database Service (RDS)
* Simple Storage Service (S3)
* ElastiCache
* Auto Scaling
* Load Balancer
* Sticky session
* Route 53
### Networking
* HTTP & HTTPS
* SSL
* Domain Name System (DNS)
### Web Socket
* socket.io
* socket.io-redis
### Test
* Mocha
* Chai
### 3rd Party APIs
* WebRTC

## Structure
### Multiple-server
![Structur](https://user-images.githubusercontent.com/70478084/123537000-f360bb80-d75f-11eb-947e-1221790f18be.jpeg)

### Load balancing sockets on horizontally scaling socket.io servers
* Set up load balancer to allocate socket.io servers to clients.
* Use sticky sessions to make sure clients connect to constant servers every time through socket.io.
* Implement horizontal auto scaling group to increase new severs when older servers reach capacity limits.
* Connect clients in different socket.io servers by socket.io-redis and AWS ElastiCache (Redis), so they can interact with others through socket.io.  
Redis adaptor in socket.io-redis library can help bind servers in the same cache, so socket.io servers are able to emit identical events and data synchronously through socket.io to thier clients. And it makes clients in different servers be able to communicate and interact with others in real time.   

# Before implementing Redis adaptor
![before_c](https://user-images.githubusercontent.com/70478084/123686680-a0335980-d882-11eb-89ec-1903b73abc71.png)

# After implementing Redis adaptor
![after_c](https://user-images.githubusercontent.com/70478084/123686923-e5f02200-d882-11eb-87c7-3d2ba589c010.png)

### Single-server
![Structure](https://user-images.githubusercontent.com/70478084/123537049-30c54900-d760-11eb-9636-6d1c323f2f4a.jpeg)

## Socket flowchart
### In game lobby
![game_process 001](https://user-images.githubusercontent.com/70478084/125712534-4ec3488e-e575-4778-a76d-84f02238f66f.jpeg)

### In the game room
![game_process 002](https://user-images.githubusercontent.com/70478084/125712830-ad78fd39-c1b5-447d-bd09-0ea936a1cb62.jpeg)

### In the game
![game_process 003](https://user-images.githubusercontent.com/70478084/125712553-5f5b4e10-a468-4a12-8492-6871263c4c05.jpeg)

## Database Schema
![Database_Schema](https://user-images.githubusercontent.com/70478084/123537080-4cc8ea80-d760-11eb-8b46-0813e8ca6de6.png)

## Features
### Start games with other players in battle game mode
Battle Game Mode

https://user-images.githubusercontent.com/70478084/123534133-73315a80-d74d-11eb-959b-428b8c5a458f.mp4

Features in the Battle Game Mode
  * Card games:
    * Interact with other players immediately in card games
    * Calculate prime factors of target number and combine them into card number in games
  * Chat room:
    * Chat with other players in text messages in chat room
  * Video chat:
    * Start a video chat with oher players in the game 
  * Game results statistic:
    * Show player performance like hit rate, scorses in each round, total scores and winner in card games

### Start games with the robot in single game mode
Single Game Mode

https://user-images.githubusercontent.com/70478084/123534151-978d3700-d74d-11eb-8cf5-42b6a31c9b5c.mp4

Features in the Single Game Mode
  * Robot:
    * Play against the opponent robot in different difficulties mode 

### Replay Games and other features
Game replay system and ohter features

https://user-images.githubusercontent.com/70478084/123537187-c2cd5180-d760-11eb-8ea0-08805cb8cdb9.mp4

Features in game reply system, user profile page and homepage
  * Game replay system:
    * Replay any games players have joined in real order and time of cards flipping
  * Profile picture:
    * Choose your fovirate pictures as your profile pictures in user profile page
  * Leaderboard:
    * Ranks the top player in user profile page
  * Lobby:
    * Show real-time number of online players in homepage
    * Show names of players and real-time number of players in game room in homepage
    * Chat with other players through text messages in homepage

## Demo Accounts
* Account1: demo1@email.com
* Password1: demo1
----
* Account2: demo2@email.com
* Password2: demo2

## Contact
<a href="https://github.com/twandylue" target="_blank">Andy Lu</a>  
Email: laserlue@gmail.com
