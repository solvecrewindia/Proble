DO $$
DECLARE
    today_date date := CURRENT_DATE;
    i integer;
    j integer;
    
    -- POOL OF 100 USER PROVIDED QUESTIONS
    pool_flashcards jsonb[] := ARRAY[
        '{"id": 1, "term": "Arrays", "question": "What is the time complexity to access an element in an array?", "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"], "correctAnswer": 0}',
        '{"id": 2, "term": "Arrays", "question": "Which data structure is used to implement an array internally?", "options": ["Linked List", "Contiguous Memory", "Tree", "Hash Table"], "correctAnswer": 1}',
        '{"id": 3, "term": "Arrays", "question": "What is the worst-case time complexity of searching in an unsorted array?", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "correctAnswer": 2}',
        '{"id": 4, "term": "Arrays", "question": "Which operation is costly in arrays?", "options": ["Access", "Insertion at end", "Deletion at end", "Insertion at beginning"], "correctAnswer": 3}',
        '{"id": 5, "term": "Arrays", "question": "What happens when an array index is out of bounds?", "options": ["Returns null", "Returns 0", "Runtime error", "Compiles successfully"], "correctAnswer": 2}',
        '{"id": 6, "term": "Linked List", "question": "Which pointer is present in a singly linked list node?", "options": ["Previous", "Next", "Parent", "Child"], "correctAnswer": 1}',
        '{"id": 7, "term": "Linked List", "question": "Time complexity to insert a node at the beginning of a linked list?", "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"], "correctAnswer": 0}',
        '{"id": 8, "term": "Linked List", "question": "Which linked list allows traversal in both directions?", "options": ["Singly", "Circular", "Doubly", "Linear"], "correctAnswer": 2}',
        '{"id": 9, "term": "Linked List", "question": "What is the extra memory cost of a doubly linked list?", "options": ["One pointer", "Two pointers", "Three pointers", "No extra cost"], "correctAnswer": 0}',
        '{"id": 10, "term": "Linked List", "question": "Which operation is faster in linked lists compared to arrays?", "options": ["Random access", "Binary search", "Insertion", "Indexing"], "correctAnswer": 2}',
        '{"id": 11, "term": "Stack", "question": "Which principle does a stack follow?", "options": ["FIFO", "LIFO", "LILO", "FILO"], "correctAnswer": 1}',
        '{"id": 12, "term": "Stack", "question": "Which operation removes an element from a stack?", "options": ["Push", "Pop", "Peek", "Insert"], "correctAnswer": 1}',
        '{"id": 13, "term": "Stack", "question": "Stack overflow occurs when?", "options": ["Stack is empty", "Stack is full", "Invalid index", "Memory leak"], "correctAnswer": 1}',
        '{"id": 14, "term": "Stack", "question": "Which application uses stack?", "options": ["BFS", "Recursion", "Level order traversal", "Queue scheduling"], "correctAnswer": 1}',
        '{"id": 15, "term": "Stack", "question": "Time complexity of push operation?", "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"], "correctAnswer": 0}',
        '{"id": 16, "term": "Queue", "question": "Which principle does a queue follow?", "options": ["LIFO", "FILO", "FIFO", "Random"], "correctAnswer": 2}',
        '{"id": 17, "term": "Queue", "question": "Which operation inserts an element into a queue?", "options": ["Pop", "Dequeue", "Enqueue", "Peek"], "correctAnswer": 2}',
        '{"id": 18, "term": "Queue", "question": "Which queue allows insertion and deletion at both ends?", "options": ["Circular Queue", "Priority Queue", "Deque", "Simple Queue"], "correctAnswer": 2}',
        '{"id": 19, "term": "Queue", "question": "Queue overflow happens when?", "options": ["Queue empty", "Queue full", "Front = rear", "Rear < front"], "correctAnswer": 1}',
        '{"id": 20, "term": "Queue", "question": "Which traversal uses a queue?", "options": ["DFS", "Inorder", "BFS", "Postorder"], "correctAnswer": 2}',
        '{"id": 21, "term": "Sorting", "question": "Which sorting algorithm has best average time complexity?", "options": ["Bubble Sort", "Insertion Sort", "Quick Sort", "Selection Sort"], "correctAnswer": 2}',
        '{"id": 22, "term": "Sorting", "question": "Worst-case time complexity of Bubble Sort?", "options": ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], "correctAnswer": 2}',
        '{"id": 23, "term": "Sorting", "question": "Which sort is stable?", "options": ["Quick Sort", "Heap Sort", "Merge Sort", "Selection Sort"], "correctAnswer": 2}',
        '{"id": 24, "term": "Sorting", "question": "Which algorithm uses divide and conquer?", "options": ["Bubble Sort", "Merge Sort", "Insertion Sort", "Selection Sort"], "correctAnswer": 1}',
        '{"id": 25, "term": "Sorting", "question": "Which sorting algorithm is in-place?", "options": ["Merge Sort", "Quick Sort", "Counting Sort", "Radix Sort"], "correctAnswer": 1}',
        '{"id": 26, "term": "Searching", "question": "Which searching algorithm works only on sorted data?", "options": ["Linear Search", "Binary Search", "DFS", "BFS"], "correctAnswer": 1}',
        '{"id": 27, "term": "Searching", "question": "Worst-case time complexity of binary search?", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "correctAnswer": 1}',
        '{"id": 28, "term": "Searching", "question": "Which search checks elements sequentially?", "options": ["Binary Search", "Jump Search", "Linear Search", "Interpolation Search"], "correctAnswer": 2}',
        '{"id": 29, "term": "Searching", "question": "Best-case time complexity of linear search?", "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"], "correctAnswer": 0}',
        '{"id": 30, "term": "Searching", "question": "Interpolation search works best when data is?", "options": ["Random", "Uniformly distributed", "Unsorted", "Sparse"], "correctAnswer": 1}',
        '{"id": 31, "term": "Trees", "question": "Which tree has at most two children?", "options": ["Binary Tree", "B-Tree", "Trie", "AVL Tree"], "correctAnswer": 0}',
        '{"id": 32, "term": "Trees", "question": "Maximum number of nodes at level L in a binary tree?", "options": ["L", "2^L", "2^(L-1)", "L^2"], "correctAnswer": 2}',
        '{"id": 33, "term": "Trees", "question": "Which traversal gives sorted order in BST?", "options": ["Preorder", "Inorder", "Postorder", "Level order"], "correctAnswer": 1}',
        '{"id": 34, "term": "Trees", "question": "Height of a tree with single node?", "options": ["0", "1", "-1", "Depends"], "correctAnswer": 0}',
        '{"id": 35, "term": "Trees", "question": "Which tree is self-balancing?", "options": ["Binary Tree", "BST", "AVL Tree", "Heap"], "correctAnswer": 2}',
        '{"id": 36, "term": "Heaps", "question": "Heap is a type of?", "options": ["Graph", "Tree", "Array", "Linked List"], "correctAnswer": 1}',
        '{"id": 37, "term": "Heaps", "question": "In max heap, the root node contains?", "options": ["Minimum value", "Maximum value", "Random value", "Median"], "correctAnswer": 1}',
        '{"id": 38, "term": "Heaps", "question": "Time complexity to insert into heap?", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "correctAnswer": 1}',
        '{"id": 39, "term": "Heaps", "question": "Heap sort time complexity?", "options": ["O(n^2)", "O(n log n)", "O(log n)", "O(n)"], "correctAnswer": 1}',
        '{"id": 40, "term": "Heaps", "question": "Heap is commonly implemented using?", "options": ["Linked List", "Array", "Stack", "Queue"], "correctAnswer": 1}',
        '{"id": 41, "term": "Graphs", "question": "Graph with no cycles is called?", "options": ["Cyclic", "Tree", "DAG", "Complete"], "correctAnswer": 2}',
        '{"id": 42, "term": "Graphs", "question": "Which traversal uses stack internally?", "options": ["BFS", "DFS", "Dijkstra", "Prim"], "correctAnswer": 1}',
        '{"id": 43, "term": "Graphs", "question": "Maximum edges in undirected graph with n vertices?", "options": ["n", "n-1", "n(n-1)/2", "n^2"], "correctAnswer": 2}',
        '{"id": 44, "term": "Graphs", "question": "Which algorithm finds shortest path?", "options": ["DFS", "BFS", "Dijkstra", "Kruskal"], "correctAnswer": 2}',
        '{"id": 45, "term": "Graphs", "question": "Adjacency matrix space complexity?", "options": ["O(V)", "O(E)", "O(V^2)", "O(V+E)"], "correctAnswer": 2}',
        '{"id": 46, "term": "Hashing", "question": "Hash table average search time?", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "correctAnswer": 0}',
        '{"id": 47, "term": "Hashing", "question": "Collision occurs when?", "options": ["Key not found", "Two keys map to same index", "Table is full", "Hash fails"], "correctAnswer": 1}',
        '{"id": 48, "term": "Hashing", "question": "Which handles collision?", "options": ["Binary Search", "Chaining", "DFS", "Sorting"], "correctAnswer": 1}',
        '{"id": 49, "term": "Hashing", "question": "Load factor = ?", "options": ["n/m", "m/n", "n^2", "m^2"], "correctAnswer": 0}',
        '{"id": 50, "term": "Hashing", "question": "Worst-case search time in hash table?", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "correctAnswer": 2}',
        '{"id": 51, "term": "Recursion", "question": "What is base case in recursion?", "options": ["Loop condition", "Stopping condition", "Recursive call", "Return value"], "correctAnswer": 1}',
        '{"id": 52, "term": "Recursion", "question": "Recursion uses which data structure?", "options": ["Queue", "Stack", "Heap", "Array"], "correctAnswer": 1}',
        '{"id": 53, "term": "Recursion", "question": "Tail recursion occurs when?", "options": ["Recursive call is first", "Recursive call is last", "Multiple calls", "No base case"], "correctAnswer": 1}',
        '{"id": 54, "term": "Recursion", "question": "What happens if no base case?", "options": ["Compile error", "Infinite loop", "Stack overflow", "Program exits"], "correctAnswer": 2}',
        '{"id": 55, "term": "Recursion", "question": "Which is better for memory?", "options": ["Recursion", "Iteration", "Both same", "Depends"], "correctAnswer": 1}',
        '{"id": 56, "term": "Dynamic Programming", "question": "DP mainly avoids?", "options": ["Sorting", "Recursion", "Overlapping subproblems", "Loops"], "correctAnswer": 2}',
        '{"id": 57, "term": "Dynamic Programming", "question": "Which problem uses DP?", "options": ["Binary Search", "Fibonacci", "DFS", "BFS"], "correctAnswer": 1}',
        '{"id": 58, "term": "Dynamic Programming", "question": "Top-down DP uses?", "options": ["Tabulation", "Memoization", "Iteration", "Greedy"], "correctAnswer": 1}',
        '{"id": 59, "term": "Dynamic Programming", "question": "Bottom-up DP uses?", "options": ["Recursion", "Memoization", "Tabulation", "Backtracking"], "correctAnswer": 2}',
        '{"id": 60, "term": "Dynamic Programming", "question": "DP reduces time by trading?", "options": ["Accuracy", "Space", "Time", "Complexity"], "correctAnswer": 1}',
        '{"id": 61, "term": "Greedy", "question": "Greedy algorithm makes choice?", "options": ["Optimal", "Local optimal", "Global", "Random"], "correctAnswer": 1}',
        '{"id": 62, "term": "Greedy", "question": "Which uses greedy approach?", "options": ["Merge Sort", "Kruskal", "Binary Search", "DFS"], "correctAnswer": 1}',
        '{"id": 63, "term": "Greedy", "question": "Greedy always gives optimal solution?", "options": ["Yes", "No", "Sometimes", "Depends"], "correctAnswer": 1}',
        '{"id": 64, "term": "Greedy", "question": "Activity selection problem uses?", "options": ["DP", "Greedy", "Backtracking", "Recursion"], "correctAnswer": 1}',
        '{"id": 65, "term": "Greedy", "question": "Greedy is faster because?", "options": ["Less memory", "No backtracking", "No recursion", "No sorting"], "correctAnswer": 1}',
        '{"id": 66, "term": "Complexity", "question": "Big-O represents?", "options": ["Best case", "Worst case", "Average case", "Exact time"], "correctAnswer": 1}',
        '{"id": 67, "term": "Complexity", "question": "Which grows fastest?", "options": ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], "correctAnswer": 2}',
        '{"id": 68, "term": "Complexity", "question": "Space complexity measures?", "options": ["Time", "Memory", "CPU", "Disk"], "correctAnswer": 1}',
        '{"id": 69, "term": "Complexity", "question": "Which is constant time?", "options": ["O(n)", "O(1)", "O(log n)", "O(n^2)"], "correctAnswer": 1}',
        '{"id": 70, "term": "Complexity", "question": "Which notation gives lower bound?", "options": ["Big-O", "Big-Ω", "Big-Θ", "Small-o"], "correctAnswer": 1}',
        '{"id": 71, "term": "Misc", "question": "Which DS uses key-value pairs?", "options": ["Array", "Stack", "Hash Map", "Queue"], "correctAnswer": 2}',
        '{"id": 72, "term": "Misc", "question": "Which DS is non-linear?", "options": ["Array", "Linked List", "Tree", "Stack"], "correctAnswer": 2}',
        '{"id": 73, "term": "Misc", "question": "Which is linear DS?", "options": ["Graph", "Tree", "Heap", "Array"], "correctAnswer": 3}',
        '{"id": 74, "term": "Misc", "question": "Which traversal visits root first?", "options": ["Inorder", "Postorder", "Preorder", "Level"], "correctAnswer": 2}',
        '{"id": 75, "term": "Misc", "question": "Which DS supports LRU cache?", "options": ["Queue", "Stack", "Hash + DLL", "Tree"], "correctAnswer": 2}',
        '{"id": 76, "term": "Advanced", "question": "Trie is used for?", "options": ["Sorting", "Prefix search", "Graphs", "DP"], "correctAnswer": 1}',
        '{"id": 77, "term": "Advanced", "question": "Segment tree is used for?", "options": ["Sorting", "Range queries", "Searching", "Traversal"], "correctAnswer": 1}',
        '{"id": 78, "term": "Advanced", "question": "Fenwick tree is also called?", "options": ["Binary Heap", "Binary Indexed Tree", "AVL", "Red-Black"], "correctAnswer": 1}',
        '{"id": 79, "term": "Advanced", "question": "Union-Find is used in?", "options": ["Sorting", "Cycle detection", "Searching", "Traversal"], "correctAnswer": 1}',
        '{"id": 80, "term": "Advanced", "question": "Amortized analysis applies to?", "options": ["Worst case", "Average case", "Sequence of operations", "Best case"], "correctAnswer": 2}',
        '{"id": 81, "term": "Final", "question": "Which DS is best for BFS?", "options": ["Stack", "Queue", "Heap", "Tree"], "correctAnswer": 1}',
        '{"id": 82, "term": "Final", "question": "Which DS is best for DFS?", "options": ["Queue", "Stack", "Array", "Heap"], "correctAnswer": 1}',
        '{"id": 83, "term": "Final", "question": "Which sort is not comparison based?", "options": ["Merge", "Quick", "Counting", "Heap"], "correctAnswer": 2}',
        '{"id": 84, "term": "Final", "question": "Which algorithm uses backtracking?", "options": ["Binary Search", "N-Queens", "Merge Sort", "Heap Sort"], "correctAnswer": 1}',
        '{"id": 85, "term": "Final", "question": "Which is NP-Complete?", "options": ["Sorting", "Searching", "Travelling Salesman", "BFS"], "correctAnswer": 2}',
        '{"id": 86, "term": "Final", "question": "Which DS minimizes height?", "options": ["BST", "AVL", "Binary Tree", "Heap"], "correctAnswer": 1}',
        '{"id": 87, "term": "Final", "question": "Which traversal uses recursion naturally?", "options": ["Level", "Inorder", "BFS", "Queue"], "correctAnswer": 1}',
        '{"id": 88, "term": "Final", "question": "Which algorithm finds MST?", "options": ["Dijkstra", "Prim", "DFS", "BFS"], "correctAnswer": 1}',
        '{"id": 89, "term": "Final", "question": "Which DS is used in compiler parsing?", "options": ["Queue", "Stack", "Heap", "Graph"], "correctAnswer": 1}',
        '{"id": 90, "term": "Final", "question": "Which DS gives O(1) average lookup?", "options": ["Array", "Linked List", "Hash Table", "Tree"], "correctAnswer": 2}',
        '{"id": 91, "term": "Final", "question": "Which algorithm is stable?", "options": ["Quick", "Heap", "Merge", "Selection"], "correctAnswer": 2}',
        '{"id": 92, "term": "Final", "question": "Which DS supports priority?", "options": ["Queue", "Stack", "Priority Queue", "Array"], "correctAnswer": 2}',
        '{"id": 93, "term": "Final", "question": "Which problem uses sliding window?", "options": ["Sorting", "Array subarray", "Tree traversal", "Graph"], "correctAnswer": 1}',
        '{"id": 94, "term": "Final", "question": "Which DS is cache-friendly?", "options": ["Linked List", "Array", "Tree", "Graph"], "correctAnswer": 1}',
        '{"id": 95, "term": "Final", "question": "Which algorithm is divide and conquer?", "options": ["Bubble", "Insertion", "Merge", "Selection"], "correctAnswer": 2}',
        '{"id": 96, "term": "Final", "question": "Which DS is best for undo operation?", "options": ["Queue", "Stack", "Heap", "Graph"], "correctAnswer": 1}',
        '{"id": 97, "term": "Final", "question": "Which traversal is breadth-first?", "options": ["DFS", "Inorder", "BFS", "Postorder"], "correctAnswer": 2}',
        '{"id": 98, "term": "Final", "question": "Which DS is used in symbol table?", "options": ["Stack", "Queue", "Hash Table", "Tree"], "correctAnswer": 2}',
        '{"id": 99, "term": "Final", "question": "Which algorithm uses relaxation?", "options": ["DFS", "BFS", "Dijkstra", "Merge"], "correctAnswer": 2}',
        '{"id": 100, "term": "Final", "question": "Which DS supports dynamic size?", "options": ["Static Array", "Dynamic Array", "Matrix", "Tuple"], "correctAnswer": 1}'
        
    ]::jsonb[];

    -- POOL OF 100 PUZZLE PAIRS (User Provided)
    pool_puzzles jsonb[] := ARRAY[
        -- Part 1: Fundamentals & Arrays (1-30)
        '{"id": 1, "term": "Array", "match": "Fixed-size contiguous memory collection"}',
        '{"id": 2, "term": "Index", "match": "Numerical position of an element"}',
        '{"id": 3, "term": "Dynamic Array", "match": "Resizables array that grows by doubling"}',
        '{"id": 4, "term": "Static Array", "match": "Collection with a size fixed at compile-time"}',
        '{"id": 5, "term": "Vector", "match": "Common name for dynamic arrays in C++"}',
        '{"id": 6, "term": "Matrix", "match": "Two-dimensional array structure"}',
        '{"id": 7, "term": "Buffer", "match": "Temporary storage area in memory"}',
        '{"id": 8, "term": "Offset", "match": "Distance from the start of an array"}',
        '{"id": 9, "term": "Bounds", "match": "The legal range of array indices"}',
        '{"id": 10, "term": "Traversal", "match": "Visiting every element in a structure"}',
        '{"id": 11, "term": "In-place", "match": "Algorithm using O(1) extra space"}',
        '{"id": 12, "term": "Stable Sort", "match": "Maintains relative order of equal keys"}',
        '{"id": 13, "term": "Pointer", "match": "Variable that stores a memory address"}',
        '{"id": 14, "term": "Dereference", "match": "Accessing the value at a pointer address"}',
        '{"id": 15, "term": "Null", "match": "Indicator of an empty or unassigned pointer"}',
        '{"id": 16, "term": "Contiguous", "match": "Stored side-by-side in memory"}',
        '{"id": 17, "term": "Slicing", "match": "Extracting a subset of a collection"}',
        '{"id": 18, "term": "Padding", "match": "Empty bits added for memory alignment"}',
        '{"id": 19, "term": "Capacity", "match": "Total space allocated for a dynamic structure"}',
        '{"id": 20, "term": "Size", "match": "The number of elements currently stored"}',
        '{"id": 21, "term": "Primitive", "match": "Basic data type like int or char"}',
        '{"id": 22, "term": "Reference", "match": "Alias for an existing memory location"}',
        '{"id": 23, "term": "Big O", "match": "Notation for worst-case time complexity"}',
        '{"id": 24, "term": "Omega", "match": "Notation for best-case time complexity"}',
        '{"id": 25, "term": "Theta", "match": "Notation for average-case time complexity"}',
        '{"id": 26, "term": "Space Complexity", "match": "Memory required by an algorithm"}',
        '{"id": 27, "term": "Time Complexity", "match": "Execution time relative to input size"}',
        '{"id": 28, "term": "Constant Time", "match": "Complexity denoted as O(1)"}',
        '{"id": 29, "term": "Linear Time", "match": "Complexity denoted as O(n)"}',
        '{"id": 30, "term": "Quadratic Time", "match": "Complexity denoted as O(n^2)"}',

        -- Part 2: Linked Lists & Linear Logic (31-60)
        '{"id": 31, "term": "Node", "match": "Basic unit containing data and a pointer"}',
        '{"id": 32, "term": "Singly Linked", "match": "Nodes with only a forward pointer"}',
        '{"id": 33, "term": "Doubly Linked", "match": "Nodes with forward and backward pointers"}',
        '{"id": 34, "term": "Circular List", "match": "Tail node points back to the head"}',
        '{"id": 35, "term": "Head", "match": "The first node in a list"}',
        '{"id": 36, "term": "Tail", "match": "The final node in a list"}',
        '{"id": 37, "term": "Sentinel", "match": "Dummy node used to simplify list logic"}',
        '{"id": 38, "term": "Next", "match": "Pointer to the succeeding node"}',
        '{"id": 39, "term": "Prev", "match": "Pointer to the preceding node"}',
        '{"id": 40, "term": "LIFO", "match": "Last In First Out"}',
        '{"id": 41, "term": "FIFO", "match": "First In First Out"}',
        '{"id": 42, "term": "Stack", "match": "Linear DS using push and pop"}',
        '{"id": 43, "term": "Queue", "match": "Linear DS using enqueue and dequeue"}',
        '{"id": 44, "term": "Push", "match": "Add an element to the top of a stack"}',
        '{"id": 45, "term": "Pop", "match": "Remove an element from the top of a stack"}',
        '{"id": 46, "term": "Peek", "match": "View the top element without removing it"}',
        '{"id": 47, "term": "Enqueue", "match": "Add an element to the rear of a queue"}',
        '{"id": 48, "term": "Dequeue", "match": "Remove an element from the front of a queue"}',
        '{"id": 49, "term": "Front", "match": "Removal point in a standard queue"}',
        '{"id": 50, "term": "Rear", "match": "Insertion point in a standard queue"}',
        '{"id": 51, "term": "Overflow", "match": "Error when adding to a full structure"}',
        '{"id": 52, "term": "Underflow", "match": "Error when removing from an empty structure"}',
        '{"id": 53, "term": "Priority Queue", "match": "Queue where elements have associated urgency"}',
        '{"id": 54, "term": "Deque", "match": "Double-ended queue structure"}',
        '{"id": 55, "term": "Circular Queue", "match": "Queue that reuses space in a ring"}',
        '{"id": 56, "term": "Reversing", "match": "Common linked list interview task"}',
        '{"id": 57, "term": "Middle Element", "match": "Found using fast and slow pointers"}',
        '{"id": 58, "term": "Cycle Detection", "match": "Floyd''s Tortoise and Hare algorithm"}',
        '{"id": 59, "term": "Skip List", "match": "Layered list allowing logarithmic search"}',
        '{"id": 60, "term": "Self-Organizing", "match": "List that moves accessed items to head"}',

        -- Part 3: Trees & Hierarchies (61-100)
        '{"id": 61, "term": "Root", "match": "The top-most node of a tree"}',
        '{"id": 62, "term": "Leaf", "match": "Node with no children"}',
        '{"id": 63, "term": "Parent", "match": "Node that has edges to child nodes"}',
        '{"id": 64, "term": "Child", "match": "Node descended from another node"}',
        '{"id": 65, "term": "Sibling", "match": "Nodes that share the same parent"}',
        '{"id": 66, "term": "Ancestor", "match": "Node on the path from root to target"}',
        '{"id": 67, "term": "Descendant", "match": "Nodes reachable from a parent node"}',
        '{"id": 68, "term": "Subtree", "match": "A tree formed by a node and its descendants"}',
        '{"id": 69, "term": "Binary Tree", "match": "Each node has at most two children"}',
        '{"id": 70, "term": "BST", "match": "Binary Search Tree"}',
        '{"id": 71, "term": "In-order", "match": "LNR traversal: gives sorted BST values"}',
        '{"id": 72, "term": "Pre-order", "match": "NLR traversal: visits root first"}',
        '{"id": 73, "term": "Post-order", "match": "LRN traversal: visits root last"}',
        '{"id": 74, "term": "Level-order", "match": "Breadth-first tree traversal"}',
        '{"id": 75, "term": "Height", "match": "Longest path from node to a leaf"}',
        '{"id": 76, "term": "Depth", "match": "Path length from root to a node"}',
        '{"id": 77, "term": "Balanced Tree", "match": "Height difference between branches is minimal"}',
        '{"id": 78, "term": "AVL Tree", "match": "Strictly balanced binary search tree"}',
        '{"id": 79, "term": "Red-Black Tree", "match": "Self-balancing tree using color coding"}',
        '{"id": 80, "term": "Rotation", "match": "Operation to rebalance a tree''s height"}',
        '{"id": 81, "term": "B-Tree", "match": "Self-balancing tree optimized for storage systems"}',
        '{"id": 82, "term": "Trie", "match": "Tree used for fast prefix lookups"}',
        '{"id": 83, "term": "Segment Tree", "match": "Tree used for range query problems"}',
        '{"id": 84, "term": "Fenwick Tree", "match": "Also known as Binary Indexed Tree"}',
        '{"id": 85, "term": "Heap", "match": "Complete tree following a min/max property"}',
        '{"id": 86, "term": "Min-Heap", "match": "Root holds the smallest element"}',
        '{"id": 87, "term": "Max-Heap", "match": "Root holds the largest element"}',
        '{"id": 88, "term": "Heapify", "match": "Process of creating a heap from an array"}',
        '{"id": 89, "term": "Complete Tree", "match": "All levels filled except possibly the last"}',
        '{"id": 90, "term": "Full Tree", "match": "Every node has 0 or 2 children"}',
        '{"id": 91, "term": "Perfect Tree", "match": "All interior nodes have two children and leaves are at same level"}',
        '{"id": 92, "term": "Skewed Tree", "match": "Tree where nodes only have one child"}',
        '{"id": 93, "term": "Degenerate Tree", "match": "Tree that performs like a linked list"}',
        '{"id": 94, "term": "LCA", "match": "Lowest Common Ancestor"}',
        '{"id": 95, "term": "Successor", "match": "The next node in in-order traversal"}',
        '{"id": 96, "term": "Predecessor", "match": "The previous node in in-order traversal"}',
        '{"id": 97, "term": "Spanning Tree", "match": "Subgraph connecting all vertices without cycles"}',
        '{"id": 98, "term": "MST", "match": "Minimum Spanning Tree"}',
        '{"id": 99, "term": "Huffman Tree", "match": "Used for data compression algorithms"}',
        '{"id": 100, "term": "Threaded Tree", "match": "Tree that stores null pointers as traversal links"}'
    ]::jsonb[];

    -- VARIABLES FOR SEQUENTIAL GENERATION
    daily_mixed jsonb[];
    daily_puzzle jsonb[]; -- New Array for Puzzle Game
    q_data jsonb;
    base_idx int;
    puzzle_idx int;
    
BEGIN
    -- Loop 100 days (Day 1 to 100)
    -- i goes from 0 to 99, so Day 1 is index 1.
    FOR i IN 0..99 LOOP
        daily_mixed := ARRAY[]::jsonb[];
        daily_puzzle := ARRAY[]::jsonb[];
        
        -- 1. FLASHCARDS + QUIZ SECTION (Keep existing logic)
        -- GET QUESTION FOR THIS DAY (ID = i + 1)
        q_data := pool_flashcards[i + 1];
        
        IF q_data IS NOT NULL THEN
            -- GENERATE QUIZ QUESTION ONLY (No Hints as per 'delete flip game')
            -- ADD THE MAIN QUIZ QUESTION
            daily_mixed := array_append(daily_mixed, 
                jsonb_build_object(
                    'type', 'quiz', 'id', q_data->'id', 'content', q_data
                )
            );
        END IF; 

        -- 2. PUZZLE GAME GENERATION (Sliding Window of 8 Pairs)
        base_idx := i + 1;
        FOR j IN 0..7 LOOP -- 8 pairs
             -- Calculate Index with Wrap-Around (1-100)
             puzzle_idx := ((base_idx + j - 1) % 100) + 1;
             
             -- Add pair to daily_puzzle array
             daily_puzzle := array_append(daily_puzzle, pool_puzzles[puzzle_idx]);
        END LOOP;

        -- INSERT BOTH MIXED (Flashcards) AND PUZZLE
        INSERT INTO daily_challenges (date, content)
        VALUES (today_date + i, 
            json_build_object(
                'mixed', daily_mixed, 
                'puzzle', daily_puzzle, -- New Field
                'date', (today_date + i)
            )
        )
        ON CONFLICT (date) DO UPDATE SET content = EXCLUDED.content;
        
    END LOOP;
END $$;
