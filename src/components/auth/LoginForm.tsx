import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login submitted", { email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          className="w-full border rounded px-3 py-2"
        />
        {/* TODO: Add email validation error here */}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full border rounded px-3 py-2"
        />
        {/* TODO: Add password validation error here */}
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white rounded px-4 py-2"
      >
        Login
      </button>
    </form>
  );
}
