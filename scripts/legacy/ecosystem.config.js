module.exports = {
  apps: [
    {
      name: "flashrates-backend",
      script: "./start.sh",
      interpreter: "bash",
      cwd: "/var/www/flashrates",
      env: {
        ADMIN_API_KEYS: "abcabc_wang_1688",
        API_KEYS: "fr_demo,fr_user1,fr_user2",
        PYTHONPATH: "/var/www/flashrates"
      }
    }
  ]
};
