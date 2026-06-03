import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 把浏览器对 /kratos/... 的请求转发到 Kratos 后端，避免 CORS。
      "/kratos": {
        target: "http://kratos-sunyihao.sl.beta.xiaohongshu.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kratos/, ""),
      },
      // 把浏览器对 /cos-upload/... 的 PUT 转发到腾讯云 COS，
      // 避免 dev 环境下浏览器 PUT 触发 CORS preflight 被拦截。
      // 上传成功后给 LLM 的链接仍是公网 COS URL（见 cosUploader.ts）。
      "/cos-upload": {
        target: "https://journal-photos-1302323802.cos.ap-shanghai.myqcloud.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/cos-upload/, ""),
      },
      // 把浏览器对 /maas/... 的请求转发到 MaaS 视觉大模型，避免 CORS。
      "/maas": {
        target: "https://maas.devops.xiaohongshu.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/maas/, ""),
      },
      // 把浏览器对 /replicate/... 的请求转发到 Replicate API，避免 CORS。
      "/replicate": {
        target: "https://api.replicate.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/replicate/, ""),
      },
    },
  },
});
