'use strict';



const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');

const {TEST_MONGODB_URI, JWT_SECRET} = require('../config');

const User = require('../models/user');
const mongoose = require('mongoose');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful Api - Login', function(){
  const username = 'myUser';
  const password = 'myPassword';
  const fullname = 'JoeSmith';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return User.hashPassword(password)
      .then(digest => User.create({ fullname, username, password: digest }));
  });


  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('Login Post /api/login', function(){
    it('should return a valid auth token', function(){
      return chai.request(app).post('/api/login').send({username, password})
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body.authToken).to.be.a('string');
  
          const payload = jwt.verify(res.body.authToken, JWT_SECRET);
         
          expect(payload.user.username).to.equal(username);
          expect(payload.user.fullname).to.equal(fullname);
          expect(payload.user).to.not.have.property('password');
        });
    });
  
    it('Should reject requests with no credentials', function(){
      return chai.request(app).post('/api/login').send({})
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.be.equal('Bad Request');
          expect(res.body).to.not.have.property('authToken');
        });
    });
  
    it('Should reject requests with incorrect usernames', function(){
      return chai.request(app).post('/api/login').send({username: 'abc', password})
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.be.equal('Unauthorized');
        });
    });
  
    it('Should reject requests with incorrect passwords', function(){
      return chai.request(app).post('/api/login').send({username, password: 'abc'})
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.be.equal('Unauthorized');
        });
    });
  });

  describe('Refresh Post /api/login', function(){
    it('should return a new token when given valid credentials', function(){
      const user = {username, password, fullname};
      const token = jwt.sign({user}, JWT_SECRET,{ subject: username, expiresIn: '1m' });
      const decoded = jwt.decode(token);

      return chai.request(app).post('/api/login/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res =>{
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          const authToken = res.body.authToken;
          expect(authToken).to.be.a('string');

          const payload = jwt.verify(authToken, JWT_SECRET);
          
          expect(payload.user).to.deep.equal({username, fullname, password});
          expect(payload.exp).to.be.greaterThan(decoded.exp);
        });
    });

    it('should reject requests with no credentials', function(){
      return chai.request(app).post('/api/login/refresh')
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.be.equal('Unauthorized');
          expect(res.body).to.not.have.property('authToken');
        });
    });

    it('should reject requests with invalid token', function(){
      const token = 'totesnotarealtoken1234';

      return chai.request(app).post('/api/login/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res =>{
          expect(res).to.have.status(401);
          expect(res.body.message).to.be.equal('Unauthorized');
          expect(res.body).to.not.have.property('authToken');
        });
    });

    it('should reject requests with expired token', function(){
      const user = {username, password, fullname};
      const token = jwt.sign({user}, JWT_SECRET,{ subject: username, expiresIn: '1ms' });

      return chai.request(app).post('/api/login/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.be.equal('Unauthorized');
          expect(res.body).to.not.have.property('authToken');
        });
    });
  });
  
});
