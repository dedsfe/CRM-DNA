export function buildTaskPath(taskId) {
  const params = new URLSearchParams({ task: String(taskId) });
  return `/tasks?${params.toString()}`;
}

function buildQuickActionPath(path, action) {
  const params = new URLSearchParams({ quickAction: action });
  return `${path}?${params.toString()}`;
}

export function buildClientPath(clientId, tab = null) {
  const params = new URLSearchParams({ id: String(clientId) });
  if (tab) params.set('tab', tab);
  return `/clients?${params.toString()}`;
}

export function buildCreateClientPath() {
  return buildQuickActionPath('/clients', 'new-client');
}

export function buildCreateTaskPath() {
  return buildQuickActionPath('/tasks', 'new-task');
}

export function buildCreateMeetingPath() {
  return buildQuickActionPath('/meetings', 'new-meeting');
}

export function buildNotificationPath(notification, clients = []) {
  if (notification.taskId) {
    return buildTaskPath(notification.taskId);
  }

  if (!notification.taskTitle) {
    return '/inbox';
  }

  const normalizedTitle = notification.taskTitle.trim().toLowerCase();
  const matchedClient = clients.find((client) =>
    client.name.trim().toLowerCase() === normalizedTitle
  );

  return matchedClient ? buildClientPath(matchedClient.id) : '/inbox';
}

export function matchesSearch(parts, query) {
  return parts.some((part) => part && part.toLowerCase().includes(query));
}
