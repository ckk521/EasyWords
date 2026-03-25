// 登录页面
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'
import { Loader2, BookOpen } from 'lucide-react'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // 检查是否有从其他页面跳转过来的错误信息（如账号过期）
  useEffect(() => {
    const loginError = sessionStorage.getItem('login_error')
    if (loginError) {
      sessionStorage.removeItem('login_error')
      toast.error(loginError)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码')
      return
    }

    setLoading(true)
    try {
      await login({ username: username.trim(), password })
      toast.success('登录成功')
      navigate('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              EasyWords
            </h1>
          </div>

          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              欢迎回来
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              AI 英语学习助手
            </p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名 / 邮箱
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名或邮箱"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>

          {/* 提示 */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            还没有账号？请联系管理员
          </p>
        </div>
      </div>
    </div>
  )
}
