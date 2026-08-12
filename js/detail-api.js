async function fetchComments(complaintId) {
  const res = await apiRequest(`/api/comments/${complaintId}`);
  return res.json();
}

async function postComment(complaintId, content) {
  const res = await apiRequest("/api/comments", {
    method: "POST",
    body: { content, complaintId },
  });
  return res.json();
}

async function fetchMedia(complaintId) {
  const res = await apiRequest(`/api/media/${complaintId}`);
  return res.json();
}

async function fetchHistory(complaintId) {
  const res = await apiRequest(`/api/complaints/${complaintId}/history`);
  return res.json();
}

async function fetchComplaint(complaintId) {
  const res = await apiRequest(`/api/complaints/${complaintId}`);
  return res.json();
}

async function upvoteComplaint(complaintId) {
  return apiRequest(`/api/complaints/${complaintId}/upvote`, { method: "POST" });
}
