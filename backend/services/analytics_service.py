# -*- coding: utf-8 -*-
"""Analytics Service — per-artisan product views, inquiry stats, income summary."""
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import datetime


def get_artisan_analytics(artisan_profile_id: str, db: Session) -> dict:
    """
    Returns per-product analytics for an artisan:
    - Total listings, views, inquiries, revenue estimate
    - Top products by inquiry count
    - Monthly activity summary
    """
    # Fetch all products
    products = db.query(models.Product).filter(
        models.Product.artisan_id == artisan_profile_id
    ).all()

    product_stats = []
    total_views = 0
    total_inquiries = 0
    total_revenue_estimate = 0.0

    for p in products:
        view_count = p.view_count or 0
        inquiry_count = db.query(func.count(models.BuyerInquiry.id)).filter(
            models.BuyerInquiry.product_id == p.id
        ).scalar() or 0

        completed_orders = db.query(func.count(models.BuyerInquiry.id)).filter(
            models.BuyerInquiry.product_id == p.id,
            models.BuyerInquiry.status == "Completed"
        ).scalar() or 0

        revenue_estimate = float(p.base_price or 0) * completed_orders

        product_stats.append({
            "product_id": str(p.id),
            "title": p.title_en,
            "status": p.status,
            "stock_count": p.stock_count,
            "base_price": float(p.base_price or 0),
            "view_count": view_count,
            "inquiry_count": inquiry_count,
            "completed_orders": completed_orders,
            "revenue_estimate": revenue_estimate,
        })

        total_views += view_count
        total_inquiries += inquiry_count
        total_revenue_estimate += revenue_estimate

    # Sort by inquiry count
    product_stats.sort(key=lambda x: x["inquiry_count"], reverse=True)

    total_orders = sum(p["completed_orders"] for p in product_stats)

    return {
        "total_listings": len(products),
        "total_products": len(products),
        "total_orders": total_orders,
        "active_listings": active_listings,
        "pending_listings": pending_listings,
        "total_views": total_views,
        "total_inquiries": total_inquiries,
        "revenue_estimate": total_revenue_estimate,
        "total_revenue_estimate": total_revenue_estimate,
        "top_products": product_stats[:5],
        "all_products": product_stats,
    }
