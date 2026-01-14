SELECT r.id, r.value, r.loop_id, r.user_id, l.title FROM ratings r JOIN loops l ON r.loop_id = l.id;
