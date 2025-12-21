<template>
  <div class="header">
    <a 
      class="logo-link" 
      href="https://www.hunnu.edu.cn/" 
      target="_blank" 
      title="Hunan Normal University Offical Website 湖南师范大学官方网站" 
      accesskey="h" 
      rel="noopener"
    >
      <img 
        src="https://pan.hunnu.edu.cn/media/custom/mylogo.png" 
        alt="HNNU Logo" 
        width="407.11" 
        height="90" 
        class="logo"
      >
    </a>
    <h1 class="title1">欢迎来到湖南师范大学!访问学校官网请点击校徽</h1>
    <h1 class="title1 subtitle">
      Welcome to Hunan Normal University! <br>
      Click the logo to visit the official website
    </h1>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 3rem;
  margin-bottom: 3rem;
}

.logo-link {
  display: block;
  margin-bottom: 2rem;
}

.logo {
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.title1 {
  text-align: center;
  font-size: 24px;
  font-family: 'Source Han Serif CN', serif;
  font-weight: 600;
  color: #8F0100;
  margin-bottom: 30px;
}

.subtitle {
  font-size: 16px;
}
</style>
