module.exports = {
  apps: [
    {
      name: "goldlab-cloud-backend",
      script: "./start.sh",
      interpreter: "bash",
      cwd: "/var/www/goldlab-cloud",
      env: {
        ADMIN_API_KEYS: "abcabc_wang_1688",
        API_KEYS: "gl_demo,gl_user1,gl_user2",
        PYTHONPATH: "/var/www/goldlab-cloud"
      }
    }
  ]
};
