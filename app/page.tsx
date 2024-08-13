"use client";

import React, { useState } from "react";
import Chat from "./components/chat";

const Home = () => {
  const [slots, setSlots] = useState([]);
  return (
    <main className="flex gap-2">
      <div className="border border-gray-400 rounded-md flex-none w-1/3 m-6 shadow-md flex flex-col">
        {slots.length ? (
          <div className="flex flex-col gap-3 p-4">
            {slots.map((slot) => (
              <div
                key={slot.idResource}
                className="py-1 border-b border-gray-400"
              >
                {new Date(slot.start).toLocaleString()}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center my-auto">
            Please ask AI for availabilities
          </div>
        )}
      </div>
      <Chat onReceiveAvailabilities={setSlots} />
    </main>
  );
};

export default Home;
