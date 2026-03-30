// API: 用户权限更新
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const permission = await prisma.userModulePermission.upsert({
      where: { userId: id },
      create: {
        userId: id,
        vocabulary: body.vocabulary ?? true,
        reading: body.reading ?? true,
        dialogue: body.dialogue ?? true,
        speak: body.speak ?? true,
      },
      update: {
        vocabulary: body.vocabulary,
        reading: body.reading,
        dialogue: body.dialogue,
        speak: body.speak,
      },
    })

    return successResponse(permission)
  } catch (error) {
    console.error('更新权限失败:', error)
    return errorResponse('UNKNOWN', '更新权限失败', 500)
  }
}
