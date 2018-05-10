'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');

const {TEST_MONGODB_URI, JWT_SECRET} = require('../config');

const User = require('../models/user');
const mongoose = require('mongoose');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful Api - Login', function(){
  const username = 'myUser';
  const password = 'myPassword';
  const fullname = 'JoeSmith';

  before(function(){
    mongoose.connect(TEST_MONGODB_URI)
      .then(() => {mongoose.connection.db.dropDatabase();});
  });

  beforeEach(function(){
    return User.hashPassword(password)
      .then(()=>{User.create({username, password, fullname});});
  });

  afterEach(function(){
    return mongoose.connection.db.dropDatabase();
  });

  after(function(){
    return mongoose.disconnect();
  });
});