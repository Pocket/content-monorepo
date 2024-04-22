module.exports = async () => {
  // Set the timezone to UTC globally.
  // Setting this in jest.setup.js does not work, because Jest is already started then, and the TZ is cached.
  process.env.TZ = 'UTC';
};
