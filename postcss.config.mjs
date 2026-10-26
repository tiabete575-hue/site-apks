const config = {
  plugins: process.env.VERCEL === "1" ? {} : { "@tailwindcss/postcss": {} },
};

export default config;
