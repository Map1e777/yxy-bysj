<template>
  <section class="login-screen">
    <div class="login-hero">
      <p class="page-kicker">Campus Shuttle OS</p>
      <h1>校园通勤班车智能排班系统</h1>
      <p>通过角色化登录进入对应工作台，管理员、调度员和师生看到的能力会不同。</p>
      <div class="login-tips">
        <el-tag>admin01 / Admin@123</el-tag>
        <el-tag type="warning">dispatch01 / Dispatch@123</el-tag>
        <el-tag type="success">student01 / Student@123</el-tag>
      </div>
    </div>

    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="panel-head">
          <div>
            <h3>登录系统</h3>
            <p>请输入账号和密码</p>
          </div>
        </div>
      </template>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-button type="primary" class="login-button" @click="handleLogin">登录</el-button>
      </el-form>
    </el-card>
  </section>
</template>

<script setup>
import { reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const { setAuth } = useAuthStore();

const form = reactive({
  username: 'admin01',
  password: 'Admin@123'
});

function resolveHome(role) {
  return role === 'STUDENT' ? '/passenger' : '/dashboard';
}

async function handleLogin() {
  try {
    const data = await login(form);
    setAuth(data);
    ElMessage.success('登录成功');
    router.push(resolveHome(data.user.role));
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '登录失败');
  }
}
</script>
