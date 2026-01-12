import { createClient } from '@supabase/supabase-js';

// Client for authentication (public/anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Client for database operations (service role key - bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SERVICE_ROLE_KEY
);

// Verify user
async function verifyUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  return error ? null : user;
}

// GET
export async function GET(request) {
  const user = await verifyUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('TodosTable')
    .select('*')
    .eq('user_id', user.id)
    // .order('id', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}

// POST
export async function POST(request) {
  const user = await verifyUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { todo } = await request.json();
  if (!todo?.trim()) return Response.json({ error: 'Todo required' }, { status: 400 });

  console.log("Inserting todo for user:", user.id);
  console.log("Todo content:", todo);

  // Use admin client to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('TodosTable')
    .insert([{ 
      todo, 
      user_id: user.id, 
      isCompleted: false 
    }])
    .select()
    .single();

  console.log("Supabase Insert Data:", data);
  console.log("Supabase Insert Error:", error);
  console.log("User ID being inserted:", user.id);

  if (error || !data?.id) {
    return Response.json({ error: error?.message || "Failed to insert todo" }, { status: 500 });
  }

  return Response.json({ success: true, data });
}

// PUT
export async function PUT(request) {
  const user = await verifyUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, newTodo } = await request.json();

  const { data, error } = await supabaseAdmin
    .from('TodosTable')
    .update({ todo: newTodo })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}

// DELETE
export async function DELETE(request) {
  const user = await verifyUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();

  const { error } = await supabaseAdmin
    .from('TodosTable')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

// PATCH
export async function PATCH(request) {
  const user = await verifyUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, isCompleted } = await request.json();

  const { data, error } = await supabaseAdmin
    .from('TodosTable')
    .update({ isCompleted })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}