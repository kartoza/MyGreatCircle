package cache

import (
	"testing"
	"time"
)

func TestLRUCache_SetAndGet(t *testing.T) {
	c := NewLRU[string, string](10, time.Hour)

	c.Set("key1", "value1")

	val, ok := c.Get("key1")
	if !ok {
		t.Fatal("expected key1 to exist")
	}
	if val != "value1" {
		t.Errorf("expected value1, got %s", val)
	}
}

func TestLRUCache_Expiration(t *testing.T) {
	c := NewLRU[string, string](10, 50*time.Millisecond)

	c.Set("key1", "value1")

	time.Sleep(100 * time.Millisecond)

	_, ok := c.Get("key1")
	if ok {
		t.Fatal("expected key1 to be expired")
	}
}

func TestLRUCache_Eviction(t *testing.T) {
	c := NewLRU[string, string](2, time.Hour)

	c.Set("key1", "value1")
	c.Set("key2", "value2")
	c.Set("key3", "value3") // Should evict key1

	_, ok := c.Get("key1")
	if ok {
		t.Fatal("expected key1 to be evicted")
	}

	_, ok = c.Get("key2")
	if !ok {
		t.Fatal("expected key2 to exist")
	}

	_, ok = c.Get("key3")
	if !ok {
		t.Fatal("expected key3 to exist")
	}
}
