// API: 单个用户操作
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        createdAt: true,
        lastLoginAt: true,
        expiresAt: true,
        expiryMode: true,
        isActive: true,
        canUseOwnApi: true,
        loginFailCount: true,
        loginLockedUntil: true,
        permission: true,
      },
    })

    if (!user) {
      return errorResponse('NOT_FOUND', '用户不存在', 404)
    }

    return successResponse(user)
  } catch (error) {
    console.error('获取用户失败:', error)
    return errorResponse('UNKNOWN', '获取用户失败', 500)
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: any = {}

    if (body.nickname !== undefined) updateData.nickname = body.nickname
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (body.expiryMode !== undefined) updateData.expiryMode = body.expiryMode
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.canUseOwnApi !== undefined) updateData.canUseOwnApi = body.canUseOwnApi

    await prisma.user.update({
      where: { id },
      data: updateData,
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('更新用户失败:', error)
    return errorResponse('UNKNOWN', '更新用户失败', 500)
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.user.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('删除用户失败:', error)
    return errorResponse('UNKNOWN', '删除用户失败', 500)
  }
}
