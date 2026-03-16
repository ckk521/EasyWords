@echo off
echo ================================
echo EasyWords 开发环境启动脚本
echo ================================

echo.
echo [1/3] 启动后端服务...
cd server
start cmd /k "pnpm install && pnpm db:push && pnpm dev"
cd ..

echo 等待后端启动...
timeout /t 8 /nobreak > nul

echo.
echo [2/3] 启动前端服务...
cd UI
start cmd /k "pnpm install && pnpm dev"
cd ..

echo.
echo [3/3] 完成!
echo.
echo 后端服务: http://localhost:3000 (或自动分配的端口)
echo 前端服务: http://localhost:5173
echo.
echo 首次使用请在设置页面配置 API
echo.
echo 按任意键退出...
pause > nul
