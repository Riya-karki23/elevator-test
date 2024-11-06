
const callBtns = document.querySelectorAll(".btn-call");
const liftImages = document.querySelectorAll(".lift-image");
const arrivalSound = document.querySelector("#arrival-sound");

let liftStates = Array(liftImages.length).fill("idle");
let liftCurrentPositions = Array.from(liftImages).map(
  (lift) => lift.getBoundingClientRect().top + window.scrollY
);
let liftAnimations = Array(liftImages.length).fill(null);
let messageElements = Array(liftImages.length).fill(null);

// Store all floor positions
const floorPositions = Array.from(callBtns).map(btn => {
  const buttonRect = btn.getBoundingClientRect();
  return buttonRect.top + window.scrollY;
});

callBtns.forEach((btn) => {
  if (btn.classList.contains("btn-call")) {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("btn-waiting")) {
        // Stop the lift if it's moving
        const liftIndex = parseInt(btn.dataset.liftindex);
        stopLift(liftIndex, btn);
        return;
      }
      
      if (btn.classList.contains("btn-arrived")) {
        return;
      }

      btn.classList.add("btn-waiting");
      btn.innerHTML = "waiting";

      const buttonRect = btn.getBoundingClientRect();
      const btnY = buttonRect.top + window.scrollY;
      const btnX = buttonRect.left + window.scrollX;

      const nearestLiftIndex = findNearestAvailableLift(btnY);

      btn.dataset.liftindex = nearestLiftIndex;

      const allLiftsAtSamePosition = liftCurrentPositions.every(
        (position) => position === btnY
      );

      if (allLiftsAtSamePosition) {
        handleAllLiftsAtPosition(btn);
      } else if (nearestLiftIndex !== -1) {
        moveLift(nearestLiftIndex, btnY, btn, btnX);
      } else {
        console.log("All lifts are currently busy");
        btn.innerHTML = "waiting";
        AvailableLift(btnY, btn);
      }
    });
  }
});

function findNearestFloor(currentPosition) {
  return floorPositions.reduce((nearest, floor) => {
    return Math.abs(currentPosition - floor) < Math.abs(currentPosition - nearest) 
      ? floor 
      : nearest;
  });
}

function stopLift(liftIndex, btn) {
  if (liftIndex === undefined || liftIndex === null) return;
  
  const lift = liftImages[liftIndex];
  
  // Clear all scheduled animations and timeouts
  if (liftAnimations[liftIndex]) {
    liftAnimations[liftIndex].forEach(timeout => clearTimeout(timeout));
    liftAnimations[liftIndex] = null;
  }

  // Remove message element if it exists
  if (messageElements[liftIndex]) {
    messageElements[liftIndex].remove();
    messageElements[liftIndex] = null;
  }

  // Get current computed position
  const currentTop = parseFloat(window.getComputedStyle(lift).top);
  
  // Find nearest floor position
  const nearestFloorPosition = findNearestFloor(currentTop);
  
  // Move to nearest floor with a short animation
  lift.style.transition = 'top 0.5s';
  lift.style.top = `${nearestFloorPosition}px`;
  
  // Update lift position and state
  liftCurrentPositions[liftIndex] = nearestFloorPosition;
  
  // Reset lift appearance after reaching nearest floor
  setTimeout(() => {
    console.log(`lift stopped at floor ${nearestFloorPosition}`)
    lift.classList.remove("lift-red", "lift-green");
    lift.classList.add("lift-black");
    liftStates[liftIndex] = "idle";
    
    // Reset button
    btn.classList.remove("btn-waiting", "btn-arrived");
    btn.classList.add("btn-call");
    btn.innerHTML = "call";
    btn.dataset.liftindex = "";
  }, 500); // Wait for the movement to nearest floor to complete
}

function moveLift(liftIndex, targetY, btn, btnX) {
  const lift = liftImages[liftIndex];
  lift.style.position = "absolute";
  lift.classList.remove("lift-black");
  lift.classList.add("lift-red");

  const currentLiftY = liftCurrentPositions[liftIndex];
  const distance = Math.abs(targetY - currentLiftY);

  const speed = 80;
  const arrivalTime = (distance / speed) * 1000;

  let totalSeconds = Math.floor(arrivalTime / 1000);

  const liftRect = lift.getBoundingClientRect();
  const liftX = liftRect.left + window.scrollX;
  const messageElement = displayMessage("", liftX, targetY);
  messageElements[liftIndex] = messageElement;

  liftAnimations[liftIndex] = [];

  if (totalSeconds <= 1) {
    messageElement.textContent = `0 min 1 sec`;
    
    const timeout = setTimeout(() => {
      handleLiftArrival(liftIndex, btn, lift, messageElement);
    }, arrivalTime + 2000);
    
    liftAnimations[liftIndex].push(timeout);
  } else {
    const countdown = setInterval(() => {
      if (totalSeconds <= 0) {
        clearInterval(countdown);
        return;
      }

      let minutes = Math.floor(totalSeconds / 60);
      let seconds = totalSeconds % 60;

      messageElement.textContent = `${minutes} mins ${seconds} sec`;
      totalSeconds--;
    }, 1000);
    
    liftAnimations[liftIndex].push(countdown);
  }

  lift.style.top = `${currentLiftY}px`;
  lift.style.transition = `top ${arrivalTime / 1000}s`;

  const moveTimeout = setTimeout(() => {
    lift.style.top = `${targetY}px`;
  }, 2000);
  
  liftAnimations[liftIndex].push(moveTimeout);

  liftCurrentPositions[liftIndex] = targetY;
  liftStates[liftIndex] = "moving";

  const arrivalTimeout = setTimeout(() => {
    handleLiftArrival(liftIndex, btn, lift, messageElement);
  }, arrivalTime + 1500);
  
  liftAnimations[liftIndex].push(arrivalTimeout);

  const resetTimeout = setTimeout(() => {
    resetButtonAndLift(liftIndex, btn);
  }, arrivalTime + 2000 + 200);
  
  liftAnimations[liftIndex].push(resetTimeout);
}

function handleLiftArrival(liftIndex, btn, lift, messageElement) {
  btn.classList.remove("btn-waiting");
  btn.classList.add("btn-arrived");
  btn.innerHTML = "Arrived";
  lift.classList.remove("lift-red");
  lift.classList.add("lift-green");
  arrivalSound.play();
  if (messageElement) {
    messageElement.remove();
  }
}

function handleAllLiftsAtPosition(btn) {
  btn.classList.remove("btn-waiting");
  btn.classList.add("btn-arrived");
  btn.innerHTML = "Arrived";

  liftImages.forEach((lift) => {
    lift.classList.remove("lift-black");
    lift.classList.add("lift-green");
  });

  setTimeout(() => {
    btn.classList.remove("btn-arrived");
    btn.classList.add("btn-call");
    btn.innerHTML = "call";

    liftImages.forEach((lift) => {
      lift.classList.remove("lift-green");
      lift.classList.add("lift-black");
    });
  }, 2000);
}

function displayMessage(text, liftX, targetY) {
  const messageElement = document.createElement("div");
  messageElement.textContent = text;

  messageElement.style.position = "absolute";
  messageElement.style.top = `${targetY}px`;
  messageElement.style.left = `${liftX}px`;
  messageElement.style.transform = "translateX(-35%)";
  messageElement.style.color = "black";
  messageElement.style.padding = "5px 10px";
  messageElement.style.borderRadius = "5px";
  messageElement.style.zIndex = "1000";
  messageElement.style.whiteSpace = "nowrap";

  document.body.appendChild(messageElement);

  return messageElement;
}

function resetButtonAndLift(liftIndex, btn) {
  setTimeout(() => {
    btn.classList.remove("btn-arrived");
    btn.classList.add("btn-call");
    btn.innerHTML = "call";

    const lift = liftImages[liftIndex];
    lift.classList.remove("lift-green");
    lift.classList.add("lift-black");

    setTimeout(() => {
      liftStates[liftIndex] = "idle";
    }, 2000);
  }, 2000);
}

function findNearestAvailableLift(targetY) {
  let nearestLiftIndex = -1;
  let shortestDistance = Infinity;

  liftCurrentPositions.forEach((liftY, index) => {
    if (liftStates[index] === "idle" && liftY !== targetY) {
      const distance = Math.abs(targetY - liftY);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestLiftIndex = index;
      }
    }
  });

  return nearestLiftIndex;
}

function AvailableLift(targetY, btn) {
  const pollingInterval = setInterval(() => {
    const nearestLiftIndex = findNearestAvailableLift(targetY);

    if (nearestLiftIndex !== -1) {
      clearInterval(pollingInterval);
      moveLift(nearestLiftIndex, targetY, btn);
    }
  }, 1000);
}