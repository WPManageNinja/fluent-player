import app from '@/bootstrap';
import { ElLoading, ElMessageBox, ElNotification } from 'element-plus';
// Removed all the @import statements as they are not valid in JavaScript files.
const globals = app.config.globalProperties;

globals.$confirm = ElMessageBox.confirm;

app.use(ElLoading).mount('#fplayer_admin_app');

window.addEventListener('offline', () => {
  	ElNotification({
		type: 'warning',
		position: 'bottom-right',
		message: 'You are currently offline.'
	});
});

window.addEventListener('online', () => {
  	ElNotification({
		type: 'success',
		position: 'bottom-right',
		message: 'Your connection has been restored.'
	});
});
