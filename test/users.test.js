'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { TEST_MONGODB_URI } = require('../config'); ('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = '$2a$10$Br7gstPhZsCEBEUfxzfbLuJqrD4EKZmHg.yBz7yvxamcnqx.1JuNu';
  const fullname = 'Example User';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase())
      .then(() => User.ensureIndexes());
  });

  beforeEach(function () {
    // noop
  });

  afterEach(function () {
    User.remove();
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('/api/users', function () {
    describe.only('POST', function () {
      it('Should create a new user', function () {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function () {
        const testUser = { password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('Missing \'username\' in request body');
          });
      });

      it('Should reject users with missing password', function(){
        const testUser = {username, fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('Missing \'password\' in request body');
          });
      });

      it('Should reject users with non-string username', function(){
        const testUser = {username : 44, password, fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('\'username\' is not a non-empty string');
          });
      });

      it('Should reject users with non-string password', function(){
        const testUser = {username, password: 44, fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('\'password\' is not a non-empty string');
          });
      });

      it('Should reject users with non-trimmed username', function(){
        const testUser = {username: ' aspace', password, fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('Invalid \'username\', remove beginning or ending whitespace');
          });
      });

      it('Should reject users with non-trimmed password', function(){
        const testUser = {password: ' aspace', username, fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('Invalid \'password\', remove beginning or ending whitespace');
          });
      });

      it('Should reject users with empty username', function(){
        const testUser = {username: '', password, fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('\'username\' is not a non-empty string');
          });
      });

      it('Should reject users with password less than 8 characters', function(){
        const testUser = {username, password: 'short', fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('Invalid password - must be at least 8 characters long');
          });
      });

      it('Should reject users with password greater than 72 characters', function(){
        const testUser = {username, 
          password: '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
          fullname};

        return chai.request(app).post('/api/users').send(testUser)
          .then(res=> {
            expect(res).to.have.status(422);
            expect(res.body.message).to.be.equal('Invalid password- must be less than 72 characters');
          });
      });

      it('Should reject users with duplicate username', function(){
        const testUser1 = {username, password, fullname};
        const testUser2 = {username,password,fullname};

        // return User.create(testUser1)
        //   .then(()=>{
        //     return chai.request(app).post('/api/users').send(testUser2);
        //   }).then(res => {
        //     expect(res).to.have.status(200);
        //   });
      
      });
      it('Should trim fullname', function(){
        const testUser = {username, password, fullname: ' a space '};
        
        chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(201);
            return User.findById(res.body.id);
          })
          .then(data =>{
            expect(data.fullname).to.be.equal(testUser.fullname.trim());
          });
      });
    });

    describe('GET', function () {
      it('Should return an empty array initially', function () {
        return chai.request(app).get('/api/users')
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');
            expect(res.body).to.have.length(0);
          });
      });
      it('Should return an array of users', function () {
        const testUser0 = {
          username: `${username}`,
          password: `${password}`,
          fullname: ` ${fullname} `
        };
        const testUser1 = {
          username: `${username}1`,
          password: `${password}1`,
          fullname: `${fullname}1`
        };
        const testUser2 = {
          username: `${username}2`,
          password: `${password}2`,
          fullname: `${fullname}2`
        };

        /**
         * CREATE THE REQUEST AND MAKE ASSERTIONS
         */
      });
    });
  });
});