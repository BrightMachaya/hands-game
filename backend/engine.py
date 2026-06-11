"""Hands Command Gameplay Simulation Architecture.

PEP 8 COMPLIANCE NOTE:
    - Imports are grouped cleanly at the top.
    - Two blank lines are maintained between top-level classes and functions.
    - All variable labels and function names strictly follow snake_case.
"""

import random
from typing import Generator


# =====================================================================
# FEATURE 1: THE DESCRIPTOR (OOP PILLAR: ENCAPSULATION)
# =====================================================================
class ScoreDescriptor:
    """A descriptor ensuring game scores cannot be set below zero.

    OOP PILLAR: ENCAPSULATION
        Descriptors are the absolute peak of field-level Encapsulation. Instead 
        of relying on objects manually validating their attributes, this class 
        safeguards data mutation by intercepting access via magic protocols 
        (`__get__` and `__set__`), shielding values from invalid states.
    """

    def __init__(self) -> None:
        self._name = ""

    def __set_name__(self, owner: object, name: str) -> None:
        self._name = name

    def __get__(self, instance: object, owner: object) -> int:
        if instance is None:
            return self
        return instance.__dict__.get(self._name, 0)

    def __set__(self, instance: object, value: int) -> None:
        # Encapsulated state protection guardrail
        if value < 0:
            raise ValueError("Score cannot be negative.")
        instance.__dict__[self._name] = value


# =====================================================================
# FEATURE 2: THE DECORATOR (OOP PILLAR: ABSTRACTION)
# =====================================================================
def require_active_game(func):
    """Decorator ensuring actions only execute when the game is running.

    OOP PILLAR: ABSTRACTION
        Decorators abstract out cross-cutting concerns. The wrapped methods 
        do not need to know anything about state checking or game lifecycle 
        logic; that reality is hidden completely behind this wrapper interface.
    """

    def wrapper(self, *args, **kwargs):
        if not self.is_active:
            print("Game Over! Action blocked.")
            return None
        return func(self, *args, **kwargs)

    return wrapper


# =====================================================================
# HOUSING CLASS (OOP PILLAR: ENCAPSULATION & ABSTRACTION)
# =====================================================================
class GameSession:
    """Manages core real-time gameplay sequences and rules."""

    # Deploying our Descriptor layer to control score property boundaries
    score = ScoreDescriptor()  # 1st Tor: Descriptor

    # -------------------------------------------------------------------------
    # FEATURE 3A: THE CONSTRUCTOR
    # -------------------------------------------------------------------------
    def __init__(self) -> None:
        """The Object Constructor Initializer.
        
        Initializes individual instance states inside the object context wrapper 
        (`self`), allocating resources and establishing initial game properties.
        """
        self.score = 0
        self.is_active = True
        self.gestures = ["raise hands", "right hand", "left hand", "no hand"]

    # -------------------------------------------------------------------------
    # FEATURE 3B: THE GENERATOR
    # -------------------------------------------------------------------------
    @require_active_game  # 2nd Tor: Decorator
    def command_stream(self) -> Generator[str, None, None]:
        """3rd Tor: Generator supplying an endless sequence of prompts.
        
        OOP PILLAR: ABSTRACTION
            Generators use lazy evaluation via the `yield` keyword. They abstract 
            the computational tracking of state sequences, pausing execution and 
            resuming seamlessly without the caller knowing how values are stored.
        """
        while self.is_active:
            yield random.choice(self.gestures)


# =====================================================================
# FEATURE 4: THE ITERATOR (OOP PILLAR: POLYMORPHISM)
# =====================================================================
class RoundIterator:
    """4th Tor: Iterator to traverse through explicit session rounds.

    OOP PILLAR: POLYMORPHISM
        By implementing `__iter__` and `__next__`, this class fulfills Python's 
        structural Iterator Protocol. It exhibits polymorphism via Duck Typing—any 
        system or loop built to iterate over collections can traverse this custom 
        object identically, without changing its own core processing mechanics.
    """

    def __init__(self, limit: int = 5) -> None:
        self.limit = limit
        self.current = 0

    def __iter__(self):
        return self

    def __next__(self) -> int:
        if self.current >= self.limit:
            # Explicit standard loop break boundary
            raise StopIteration
        self.current += 1
        return self.current