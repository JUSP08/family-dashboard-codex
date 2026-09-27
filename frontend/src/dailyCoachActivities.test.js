import test from "node:test";
import assert from "node:assert/strict";

import { getDailyCoachTasksForDate } from "./dailyCoachActivities.js";

const children = [
  { id: "young", name: "Young", role: "child", age: 5 },
  { id: "older", name: "Older", role: "child", age: 14 },
];

test("creates a deterministic age-appropriate daily mix all year", () => {
  const input = { masterTasks: [], childrenData: children, date: new Date(2026, 8, 27) };
  const first = getDailyCoachTasksForDate(input);
  const second = getDailyCoachTasksForDate(input);

  assert.deepEqual(first, second);
  assert.equal(first.length, 4);

  for (const child of children) {
    const tasks = first.filter((task) => task.assignees.includes(child.id));
    assert.equal(tasks.length, 2);
    assert.deepEqual(new Set(tasks.map((task) => task.type)), new Set(["physical", "helpful"]));
    assert.ok(tasks.every((task) => child.age >= task.minAge && child.age <= task.maxAge));
  }
});

test("uses broadly suitable activities when a child's age is not set", () => {
  const tasks = getDailyCoachTasksForDate({
    masterTasks: [],
    childrenData: [{ id: "unset", role: "child" }],
    date: new Date(2026, 8, 28),
  });

  assert.equal(tasks.length, 2);
  assert.ok(tasks.every((task) => task.minAge <= 7 && task.maxAge >= 12));
});

test("summer mode keeps essentials and creates three activities per child", () => {
  const masterTasks = [
    { id: "mt1", label: "Brush teeth", days: [], assignees: ["all"] },
    { id: "optional", label: "Regular optional task", days: [], assignees: ["all"] },
  ];
  const tasks = getDailyCoachTasksForDate({ masterTasks, childrenData: children, date: new Date(2026, 6, 15) });

  assert.ok(tasks.some((task) => task.id === "mt1"));
  assert.ok(!tasks.some((task) => task.id === "optional"));
  assert.equal(tasks.filter((task) => task.isDailyChallenge).length, 6);
});
