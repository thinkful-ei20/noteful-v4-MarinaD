'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {JWT_SECRET, JWT_EXPIRY} = require('../config');
const passport = require('passport');

const createAuthToken = function(user){
  return jwt.sign({user},JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
};

const options = {session: false, failWithError: true};

const localAuth = passport.authenticate('local', options);


router.post('/', localAuth, function(req,res){
  const authToken = createAuthToken(req.user);
  return res.json({authToken});
});

const jwtAuth = passport.authenticate('jwt', {session: false, failWithError : true});

router.post('/refresh', jwtAuth, (req,res) =>{
  const authToken = createAuthToken(req.user);
  res.json({authToken});
});

module.exports = router;