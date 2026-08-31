**Singly Linked List**

# 1\. What Is a Singly Linked List?

A singly linked list is a linear data structure made of nodes. Each node stores a data value and a pointer (“next”) to the following node. Unlike an array, nodes don't need to sit next to each other in memory — the next pointer is what links them together.

HEAD  
↓  
\[10 | •\] → \[20 | •\] → \[30 | •\] → NULL

The last node's next always points to NULL, marking the end of the list. If the list has no nodes at all, HEAD itself points to NULL — that's how you check for an empty list.

# 2\. Why Use a Linked List Instead of an Array?

Arrays store elements in contiguous memory, so any element can be accessed instantly by index (O(1)) — but inserting or deleting in the middle requires shifting every following element.

Linked lists trade that instant access for cheap insertion/deletion: since nodes are connected by pointers rather than position, adding or removing a node only means rewiring a couple of links — no shifting required. The cost is that reaching any node requires walking from HEAD, one step at a time (no random access).

| **Feature** | **Array** | **Singly Linked List** |
| --- | --- | --- |
| Random access | O(1) | O(n) |
| Insert/Delete at front | O(n) | O(1) |
| Memory layout | Contiguous | Scattered (via pointers) |
| Resizing | May need to resize | Naturally dynamic |

# 3\. Node Structure

A node is a small object/struct with two fields: data and next.

class Node {  
int data;  
Node next;  
Node(int data) { this.data = data; this.next = null; }  
}

A freshly created node's next is null until you deliberately link it to another node, e.g. n1.next = n2;

# 4\. HEAD, Traversal, and Search

**HEAD:** the reference to the first node. HEAD = NULL means the list is empty.

**Traversal:** visiting every node from HEAD to NULL using a temporary pointer (so HEAD itself never moves).

current = HEAD  
while current != NULL:  
process current.data  
current = current.next

Traversal runs in O(n) time and O(1) extra space.

**Search:** since there's no indexing, you must check nodes one by one from HEAD until you find the value or hit NULL. Best case O(1), worst/average case O(n).

# 5\. Insertion

## 5.1 At the Beginning — O(1)

newNode.next = HEAD  
HEAD = newNode

Link the new node to the old HEAD before moving HEAD, or you'll lose the rest of the list.

## 5.2 At the End — O(n), or O(1) with a tail pointer

Without a tail pointer you must traverse to the last node first, then set last.next = newNode. Keeping a separate tail reference skips that traversal entirely.

## 5.3 After a Given Node / At a Position — O(n)

newNode.next = current.next // save the old link FIRST  
current.next = newNode // then rewire

Example: inserting 30 after 20 in 10→20→40→NULL gives 10→20→30→40→NULL. Reversing the order of those two lines is the most common beginner bug — it permanently disconnects the rest of the list.

# 6\. Deletion

## 6.1 From the Beginning — O(1)

HEAD = HEAD.next

## 6.2 From the End — O(n)

You need the second-last node to set its next to NULL. Even with a tail pointer, this is still O(n) in a singly linked list, because you can't move backward from the tail to find its predecessor.

## 6.3 A Given Node — O(1) once its predecessor is known

prev.next = target.next

This “skips over” the target node, directly linking its neighbors together.

# 7\. Reversing a Linked List (Most Asked Interview Problem)

Goal: turn 10→20→30→40→NULL into 40→30→20→10→NULL. Use three pointers — prev, curr, and next — and flip one link at a time:

prev = NULL  
curr = HEAD  
while curr != NULL:  
next = curr.next // bookmark before overwriting  
curr.next = prev // reverse the link  
prev = curr  
curr = next  
HEAD = prev

Time O(n), space O(1). Being able to trace this by hand on a small example is more valuable than memorizing the code.

# 8\. Slow & Fast Pointers: Middle, Nth-from-End, and Cycles

## 8.1 Finding the Middle Node

slow moves one step, fast moves two. When fast reaches the end, slow sits at the middle. Example: in 10→20→30→40→50, slow lands on 30.

## 8.2 Nth Node From the End

Move a pointer first n steps ahead, then advance both first and second together. When first hits NULL, second is at the target — e.g., the 2nd-from-end node in 10→20→30→40→50 is 40.

## 8.3 Detecting a Cycle (Floyd's Algorithm)

If a list loops back on itself instead of ending at NULL, a plain traversal never terminates. Using slow (1 step) and fast (2 steps) pointers, they will eventually meet at the same node if — and only if — a cycle exists.

## 8.4 Finding Where the Cycle Starts

After slow meets fast, reset one pointer to HEAD and advance both one step at a time. Wherever they meet next is the start of the cycle.

# 9\. Palindrome Check and Merging Sorted Lists

## 9.1 Palindrome Check

1→2→3→2→1 reads the same forward and backward. Approach: find the middle → reverse the second half → compare both halves node by node → (optionally) reverse back. This runs in O(n) time and O(1) extra space.

## 9.2 Merging Two Sorted Lists

Given 1→3→5 and 2→4→6, repeatedly compare the current nodes of both lists and attach whichever is smaller. Result: 1→2→3→4→5→6, in O(n+m) time.

# 10\. Complexity Cheat Sheet

| **Operation** | **Complexity** |
| --- | --- |
| Traversal / Search | O(n) |
| Insert at beginning | O(1) |
| Insert at end (no tail / with tail) | O(n) / O(1) |
| Delete beginning | O(1) |
| Delete end | O(n) |
| Delete given node (predecessor known) | O(1) |
| Reverse / Find middle / Detect cycle | O(n) |

# 11\. Edge Cases to Always Check

-   Empty list (HEAD = NULL)
-   List with exactly one node
-   Deleting the HEAD node — make sure HEAD is reassigned
-   Deleting the last node — make sure the new last node points to NULL
-   Inserting into an empty list
-   A hidden cycle — never assume the list is guaranteed to end at NULL

# 12\. The Five Core Patterns

-   Previous + Current → insertion / deletion
-   Slow + Fast → middle node, cycle detection, cycle start
-   Three pointers (prev, curr, next) → reversal
-   Dummy node → simplifies insertion, deletion, merging
-   Two pointers with a fixed gap → nth node from the end

  
Learn these five patterns instead of memorizing individual problems — nearly every linked-list question is a variation on one of them.