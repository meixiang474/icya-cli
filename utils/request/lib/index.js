"use strict";

const axios = require("axios");

const BASE_URL = process.env.ICYA_CLI_BASE_URL
  ? process.env.ICYA_CLI_BASE_URL
  : "http://cli.icya.xyz:7001";

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (err) => {
    return Promise.reject(err);
  }
);

module.exports = request;
