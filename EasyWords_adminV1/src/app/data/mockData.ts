// Mock data strictly based on DB schema from B端实施计划.md

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  nickname: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  loginFailCount: number;
  loginLockedUntil: string | null;
  permission: UserModulePermission | null;
}

export interface UserModulePermission {
  id: string;
  userId: string;
  vocabulary: boolean;
  reading: boolean;
  dialogue: boolean;
  speak: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginLog {
  id: string;
  userId: string | null;
  username: string;
  status: "success" | "failed";
  failReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: "add_word" | "add_article" | "add_dialogue" | "add_conversation";
  resourceId: string | null;
  resourceType: string | null;
  details: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  todayNewUsers: number;
  activeUsers: number;
  expiredUsers: number;
  disabledUsers: number;
  totalActivities: number;
}

// ---- Mock Users ----
export const mockUsers: User[] = [
  {
    id: "u-001",
    username: "ckk521",
    email: "ckk521@example.com",
    passwordHash: "hashed",
    nickname: "超级管理员",
    createdAt: "2026-01-01T08:00:00Z",
    lastLoginAt: "2026-03-20T14:30:00Z",
    expiresAt: null,
    isActive: true,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-001",
      userId: "u-001",
      vocabulary: true,
      reading: true,
      dialogue: true,
      speak: true,
      createdAt: "2026-01-01T08:00:00Z",
      updatedAt: "2026-03-20T08:00:00Z",
    },
  },
  {
    id: "u-002",
    username: "alice_wang",
    email: "alice@example.com",
    passwordHash: "hashed",
    nickname: "Alice",
    createdAt: "2026-02-10T09:00:00Z",
    lastLoginAt: "2026-03-19T10:00:00Z",
    expiresAt: "2026-04-10T00:00:00Z",
    isActive: true,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-002",
      userId: "u-002",
      vocabulary: true,
      reading: true,
      dialogue: false,
      speak: false,
      createdAt: "2026-02-10T09:00:00Z",
      updatedAt: "2026-03-10T08:00:00Z",
    },
  },
  {
    id: "u-003",
    username: "bob_lee",
    email: "bob@gmail.com",
    passwordHash: "hashed",
    nickname: null,
    createdAt: "2026-02-15T11:00:00Z",
    lastLoginAt: "2026-03-15T09:00:00Z",
    expiresAt: "2026-03-15T00:00:00Z",
    isActive: true,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-003",
      userId: "u-003",
      vocabulary: true,
      reading: true,
      dialogue: true,
      speak: true,
      createdAt: "2026-02-15T11:00:00Z",
      updatedAt: "2026-02-15T11:00:00Z",
    },
  },
  {
    id: "u-004",
    username: "charlie_xu",
    email: "charlie@outlook.com",
    passwordHash: "hashed",
    nickname: "Charlie",
    createdAt: "2026-02-20T14:00:00Z",
    lastLoginAt: "2026-03-01T08:00:00Z",
    expiresAt: "2026-06-20T00:00:00Z",
    isActive: false,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-004",
      userId: "u-004",
      vocabulary: true,
      reading: false,
      dialogue: false,
      speak: false,
      createdAt: "2026-02-20T14:00:00Z",
      updatedAt: "2026-03-01T08:00:00Z",
    },
  },
  {
    id: "u-005",
    username: "diana_chen",
    email: "diana.chen@example.com",
    passwordHash: "hashed",
    nickname: "Diana",
    createdAt: "2026-03-01T10:00:00Z",
    lastLoginAt: "2026-03-20T13:00:00Z",
    expiresAt: "2026-09-01T00:00:00Z",
    isActive: true,
    loginFailCount: 2,
    loginLockedUntil: null,
    permission: {
      id: "p-005",
      userId: "u-005",
      vocabulary: true,
      reading: true,
      dialogue: true,
      speak: false,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-10T10:00:00Z",
    },
  },
  {
    id: "u-006",
    username: "evan_liu",
    email: "evan.liu@hotmail.com",
    passwordHash: "hashed",
    nickname: null,
    createdAt: "2026-03-05T08:30:00Z",
    lastLoginAt: "2026-03-20T09:00:00Z",
    expiresAt: "2026-04-05T00:00:00Z",
    isActive: true,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-006",
      userId: "u-006",
      vocabulary: true,
      reading: true,
      dialogue: true,
      speak: true,
      createdAt: "2026-03-05T08:30:00Z",
      updatedAt: "2026-03-05T08:30:00Z",
    },
  },
  {
    id: "u-007",
    username: "fiona_zhang",
    email: "fiona.zhang@example.com",
    passwordHash: "hashed",
    nickname: "Fiona",
    createdAt: "2026-03-10T15:00:00Z",
    lastLoginAt: "2026-03-18T16:00:00Z",
    expiresAt: "2026-05-10T00:00:00Z",
    isActive: true,
    loginFailCount: 5,
    loginLockedUntil: "2026-03-20T14:35:00Z",
    permission: {
      id: "p-007",
      userId: "u-007",
      vocabulary: true,
      reading: true,
      dialogue: false,
      speak: false,
      createdAt: "2026-03-10T15:00:00Z",
      updatedAt: "2026-03-10T15:00:00Z",
    },
  },
  {
    id: "u-008",
    username: "george_wu",
    email: "george@example.com",
    passwordHash: "hashed",
    nickname: "George",
    createdAt: "2026-03-18T11:00:00Z",
    lastLoginAt: "2026-03-20T11:30:00Z",
    expiresAt: "2026-03-23T00:00:00Z",
    isActive: true,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-008",
      userId: "u-008",
      vocabulary: true,
      reading: true,
      dialogue: true,
      speak: true,
      createdAt: "2026-03-18T11:00:00Z",
      updatedAt: "2026-03-18T11:00:00Z",
    },
  },
  {
    id: "u-009",
    username: "helen_ma",
    email: "helen.ma@qq.com",
    passwordHash: "hashed",
    nickname: null,
    createdAt: "2026-03-19T16:00:00Z",
    lastLoginAt: null,
    expiresAt: null,
    isActive: true,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-009",
      userId: "u-009",
      vocabulary: true,
      reading: true,
      dialogue: true,
      speak: true,
      createdAt: "2026-03-19T16:00:00Z",
      updatedAt: "2026-03-19T16:00:00Z",
    },
  },
  {
    id: "u-010",
    username: "ivan_sun",
    email: "ivan.sun@gmail.com",
    passwordHash: "hashed",
    nickname: "Ivan",
    createdAt: "2026-03-20T08:00:00Z",
    lastLoginAt: "2026-03-20T08:15:00Z",
    expiresAt: "2026-04-20T00:00:00Z",
    isActive: true,
    loginFailCount: 0,
    loginLockedUntil: null,
    permission: {
      id: "p-010",
      userId: "u-010",
      vocabulary: true,
      reading: true,
      dialogue: true,
      speak: true,
      createdAt: "2026-03-20T08:00:00Z",
      updatedAt: "2026-03-20T08:00:00Z",
    },
  },
];

// ---- Mock Login Logs ----
export const mockLoginLogs: Record<string, LoginLog[]> = {
  "u-001": [
    {
      id: "ll-001",
      userId: "u-001",
      username: "ckk521",
      status: "success",
      failReason: null,
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T14:30:00Z",
    },
    {
      id: "ll-002",
      userId: "u-001",
      username: "ckk521",
      status: "success",
      failReason: null,
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-19T09:00:00Z",
    },
    {
      id: "ll-003",
      userId: "u-001",
      username: "ckk521",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-18T08:55:00Z",
    },
    {
      id: "ll-004",
      userId: "u-001",
      username: "ckk521",
      status: "success",
      failReason: null,
      ipAddress: "10.0.0.5",
      userAgent: "Mozilla/5.0 Safari/605",
      createdAt: "2026-03-17T14:00:00Z",
    },
  ],
  "u-002": [
    {
      id: "ll-010",
      userId: "u-002",
      username: "alice_wang",
      status: "success",
      failReason: null,
      ipAddress: "203.0.113.5",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-19T10:00:00Z",
    },
    {
      id: "ll-011",
      userId: "u-002",
      username: "alice_wang",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "203.0.113.5",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-19T09:58:00Z",
    },
    {
      id: "ll-012",
      userId: "u-002",
      username: "alice_wang",
      status: "success",
      failReason: null,
      ipAddress: "203.0.113.5",
      userAgent: "Mozilla/5.0 Firefox/124",
      createdAt: "2026-03-15T11:00:00Z",
    },
  ],
  "u-005": [
    {
      id: "ll-020",
      userId: "u-005",
      username: "diana_chen",
      status: "success",
      failReason: null,
      ipAddress: "192.0.2.10",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T13:00:00Z",
    },
    {
      id: "ll-021",
      userId: "u-005",
      username: "diana_chen",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "192.0.2.10",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T12:58:00Z",
    },
    {
      id: "ll-022",
      userId: "u-005",
      username: "diana_chen",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "192.0.2.10",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T12:57:00Z",
    },
  ],
  "u-007": [
    {
      id: "ll-030",
      userId: "u-007",
      username: "fiona_zhang",
      status: "failed",
      failReason: "账号已锁定",
      ipAddress: "198.51.100.3",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T14:34:00Z",
    },
    {
      id: "ll-031",
      userId: "u-007",
      username: "fiona_zhang",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "198.51.100.3",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T14:33:00Z",
    },
    {
      id: "ll-032",
      userId: "u-007",
      username: "fiona_zhang",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "198.51.100.3",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T14:32:00Z",
    },
    {
      id: "ll-033",
      userId: "u-007",
      username: "fiona_zhang",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "198.51.100.3",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T14:31:00Z",
    },
    {
      id: "ll-034",
      userId: "u-007",
      username: "fiona_zhang",
      status: "failed",
      failReason: "密码错误",
      ipAddress: "198.51.100.3",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-20T14:30:00Z",
    },
    {
      id: "ll-035",
      userId: "u-007",
      username: "fiona_zhang",
      status: "success",
      failReason: null,
      ipAddress: "198.51.100.3",
      userAgent: "Mozilla/5.0 Chrome/122",
      createdAt: "2026-03-18T16:00:00Z",
    },
  ],
};

// ---- Mock User Activities ----
export const mockActivities: Record<string, UserActivity[]> = {
  "u-001": [
    {
      id: "a-001",
      userId: "u-001",
      action: "add_word",
      resourceId: "w-001",
      resourceType: "word",
      details: JSON.stringify({ word: "ephemeral", chineseDefinition: "短暂的" }),
      createdAt: "2026-03-20T14:25:00Z",
    },
    {
      id: "a-002",
      userId: "u-001",
      action: "add_article",
      resourceId: "art-001",
      resourceType: "article",
      details: JSON.stringify({ title: "科技改变生活", level: "intermediate" }),
      createdAt: "2026-03-20T13:00:00Z",
    },
    {
      id: "a-003",
      userId: "u-001",
      action: "add_dialogue",
      resourceId: "d-001",
      resourceType: "dialogue",
      details: JSON.stringify({ scene: "咖啡厅点餐", level: "beginner" }),
      createdAt: "2026-03-19T15:00:00Z",
    },
    {
      id: "a-004",
      userId: "u-001",
      action: "add_word",
      resourceId: "w-002",
      resourceType: "word",
      details: JSON.stringify({ word: "serendipity", chineseDefinition: "意外发现美好事物的能力" }),
      createdAt: "2026-03-19T11:00:00Z",
    },
    {
      id: "a-005",
      userId: "u-001",
      action: "add_conversation",
      resourceId: "c-001",
      resourceType: "speak_conversation",
      details: JSON.stringify({ topic: "日常问候练习" }),
      createdAt: "2026-03-18T10:00:00Z",
    },
  ],
  "u-002": [
    {
      id: "a-010",
      userId: "u-002",
      action: "add_word",
      resourceId: "w-010",
      resourceType: "word",
      details: JSON.stringify({ word: "apple", chineseDefinition: "苹果" }),
      createdAt: "2026-03-19T10:30:00Z",
    },
    {
      id: "a-011",
      userId: "u-002",
      action: "add_article",
      resourceId: "art-010",
      resourceType: "article",
      details: JSON.stringify({ title: "环球旅行指南", level: "beginner" }),
      createdAt: "2026-03-18T14:00:00Z",
    },
    {
      id: "a-012",
      userId: "u-002",
      action: "add_word",
      resourceId: "w-011",
      resourceType: "word",
      details: JSON.stringify({ word: "brilliant", chineseDefinition: "杰出的" }),
      createdAt: "2026-03-17T09:00:00Z",
    },
  ],
  "u-005": [
    {
      id: "a-020",
      userId: "u-005",
      action: "add_word",
      resourceId: "w-020",
      resourceType: "word",
      details: JSON.stringify({ word: "melancholy", chineseDefinition: "忧郁" }),
      createdAt: "2026-03-20T12:00:00Z",
    },
    {
      id: "a-021",
      userId: "u-005",
      action: "add_dialogue",
      resourceId: "d-020",
      resourceType: "dialogue",
      details: JSON.stringify({ scene: "机场问询", level: "intermediate" }),
      createdAt: "2026-03-19T16:00:00Z",
    },
    {
      id: "a-022",
      userId: "u-005",
      action: "add_article",
      resourceId: "art-020",
      resourceType: "article",
      details: JSON.stringify({ title: "人工智能的未来", level: "advanced" }),
      createdAt: "2026-03-18T10:00:00Z",
    },
    {
      id: "a-023",
      userId: "u-005",
      action: "add_word",
      resourceId: "w-021",
      resourceType: "word",
      details: JSON.stringify({ word: "perseverance", chineseDefinition: "毅力" }),
      createdAt: "2026-03-15T11:00:00Z",
    },
  ],
};

// ---- Stats ----
export const mockStats: AdminStats = {
  totalUsers: 10,
  todayNewUsers: 2,
  activeUsers: 8,
  expiredUsers: 1,
  disabledUsers: 1,
  totalActivities: 47,
};

// ---- Chart data for Dashboard ----
export const mockDailyNewUsers = [
  { date: "03-14", count: 1 },
  { date: "03-15", count: 0 },
  { date: "03-16", count: 2 },
  { date: "03-17", count: 1 },
  { date: "03-18", count: 3 },
  { date: "03-19", count: 1 },
  { date: "03-20", count: 2 },
];

export const mockActivityTrend = [
  { date: "03-14", add_word: 5, add_article: 2, add_dialogue: 1, add_conversation: 1 },
  { date: "03-15", add_word: 3, add_article: 1, add_dialogue: 0, add_conversation: 2 },
  { date: "03-16", add_word: 8, add_article: 3, add_dialogue: 2, add_conversation: 0 },
  { date: "03-17", add_word: 6, add_article: 2, add_dialogue: 1, add_conversation: 1 },
  { date: "03-18", add_word: 10, add_article: 4, add_dialogue: 3, add_conversation: 2 },
  { date: "03-19", add_word: 7, add_article: 2, add_dialogue: 2, add_conversation: 1 },
  { date: "03-20", add_word: 4, add_article: 1, add_dialogue: 1, add_conversation: 0 },
];
