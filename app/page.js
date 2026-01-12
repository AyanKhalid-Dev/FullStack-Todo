"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// -------- Supabase Client (for Auth only) --------
const supabaseurl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasekey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseurl,
  supabasekey
);

export default function Home() {
  const [session, setSession] = useState(null);
  const [todos, settodos] = useState([]);
  const [todo, settodo] = useState("");
  const [reply, setreply] = useState("");
  const [editingid, seteditingid] = useState(null);
  const [editingvalue, seteditingvalue] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // ---------- SESSION TRACKING ----------
  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }
    fetchSession();

    const { subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch todos when session changes
  useEffect(() => {
    if (session) {
      fetchTodos();
    } else {
      settodos([]);
    }
  }, [session]);

  // ---------- GET TODOS (via API) ----------
  async function fetchTodos() {
    if (!session) return;

    try {
      const res = await fetch("/api/todo", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
      });

      if (!res.ok) {
        settodos([]);
        return;
      }

      const data = await res.json();
      settodos(data.data || []);
    } catch (err) {
      console.error(err);
      settodos([]);
    }
  }

  // ---------- ADD TODO (via API) ----------
  async function Post() {

    // if (!todo.trim()) return setreply("Please enter a todo.");
    // const tempTodo = {id:Date.now(),todo,isCompleted:false}
    // settodos((prev)=>[tempTodo,...prev]);
    // settodo("")
    // setLoading(true);
    // try{
    //   const res=await fetch("/api/todo",{
    //     method:"POST",
    //     headers:{
    //       "Content-Type":"application/json",
    //       Authorization:`Bearer ${session.access_token}`
    //     },
    //     body:JSON.stringify({todo})
    //   });
    //   console.log("API Response Status:",res.status);
    //   const data=await res.json();
    //   console.log("API Response Data:",data);
    //   if(!res.ok || !data?.data?.id) throw new Error("Invalid API response");
    //   settodos(prev=>prev.map(t=>t.id===tempTodo.id?data.data:t))
    //   setreply("Added successfully");
    // }catch(err){
    //   console.error("Error in Post function:",err);
    //   settodos(prev=>prev.filter(t=>t.id!==tempTodo.id));
    //   setreply("Failed to add todo");
    // }finally{
    //   setLoading(false);
    // }
    if (todo.trim() === "") return setreply("Todo can't be empty")
    const tempTodo = { id: Date.now(), todo, isCompleted: false }
    settodos(prev=>[tempTodo,...prev])
    settodo("")
    setLoading(true)
    try{
      const res=await fetch("/api/todo",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${session.access_token}`
        },
        body:JSON.stringify({todo})
      });
      const data= await res.json()
      settodos(prev=>prev.map(t=>t.id===tempTodo.id?data.data:t))
      setreply("Added successfully")
    }catch(err){
      console.log(err)
      settodos(prev=>prev.map(t=>t.id!==tempTodo.id))
      setreply("Failed to add todo")
    }finally{
      setLoading(false)
    }
  }

  // ---------- UPDATE TODO (via API) ----------
  async function PUT(id) {

    if(!editingvalue.trim()) return setreply("Todo can't be empty");
    const prevtodos = [...todos]
    settodos(prev=>prev.map(t=>t.id===id?{...t,todo:editingvalue}:t))
    seteditingid(null)
    seteditingvalue("")
    setLoading(true)
    try{
      const res=await fetch("/api/todo",{
        method:"PUT",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${session.access_token}`
        },
        body:JSON.stringify({id,newTodo:editingvalue})
      });
      if(!res.ok) throw new Error("Failed to update todo")
      setreply("Updated successfully")
    }catch(err){
      console.log(err)
      settodos(prevtodos)
      setreply("Failed to update todo")
    }finally{
      setLoading(false)
    }
  }

  // ---------- DELETE TODO (via API) ----------
  async function Delete(id) {
    const prevTodos = [...todos];
    settodos((prev) => prev.filter((t) => t.id !== id));
    setLoading(true);
    settodo("");
    seteditingid(null);
    seteditingvalue("");

    try {
      const res = await fetch("/api/todo", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Failed to delete todo");

      setreply("Deleted successfully");
    } catch (err) {
      console.error(err);
      settodos(prevTodos);
      setreply("Failed to delete todo");
    } finally {
      setLoading(false);
    }
  }

  // ---------- TOGGLE COMPLETED (via API) ----------
  async function toggleCompleted(id, newValue) {
    const prevTodos = [...todos];
    settodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: newValue } : t))
    );

    try {
      const res = await fetch("/api/todo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, isCompleted: newValue }),
      });

      if (!res.ok) throw new Error("Failed to toggle todo");
    } catch (err) {
      console.error(err);
      settodos(prevTodos);
      setreply("Failed to toggle todo");
    }
  }

  // ---------- AUTH ----------
  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function loginWithEmail() {
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setAuthError(error.message);
    setSession(data.session);
  }

  async function signupWithEmail() {
    setAuthError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return setAuthError(error.message);
    setSession(data.session);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    settodos([]);
    setEmail("");
    setPassword("");
    setAuthError("");
  }

  const setEditing = () => {
    seteditingid(null);
    seteditingvalue("");
  };

  // ---------- UI ----------
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col gap-4 w-full max-w-sm bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={loginWithEmail}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Login
            </button>
            <button
              onClick={signupWithEmail}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Sign Up
            </button>
          </div>
          {authError && <p className="text-red-500 text-center">{authError}</p>}
        </div>

        <div className="text-gray-400">or</div>

        <button
          onClick={loginWithGoogle}
          className="px-6 py-3 bg-black text-white rounded-lg hover:scale-105 transform transition"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📝 Todo Dashboard</h1>

          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

        {/* Add Todo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={editingid ? editingvalue : todo}
              onChange={(e) =>
                editingid ? seteditingvalue(e.target.value) : settodo(e.target.value)
              }
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => (editingid ? PUT(editingid) : todo.trim() && Post())}
              className={`px-5 py-2 text-white rounded-lg transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              disabled={loading}
            >
              {loading ? "Processing..." : editingid ? "Update" : "Add"}
            </button>
          </div>
        </div>

        {/* Todos List */}
        <div className="space-y-3">
          {todos?.map((item) => (
            item && (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => toggleCompleted(item.id, !item.isCompleted)}
                    className="w-5 h-5"
                  />
                  <span
                    className={`text-gray-900 dark:text-white wrap-break-word ${item.isCompleted ? "line-through text-gray-400 dark:text-gray-500" : ""
                      }`}
                  >
                    {item.todo}
                  </span>
                </div>

                <div className="flex gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={() => {
                      seteditingid(item.id);
                      seteditingvalue(item.todo);
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => Delete(item.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          ))}
        </div>

        {reply && (
          <div className="text-center mt-4 text-gray-900 dark:text-white font-medium">{reply}</div>
        )}
      </div>
    </div>
  );
}